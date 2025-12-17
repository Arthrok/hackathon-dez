import { PoolClient } from 'pg';
import { pool } from '../../../shared/infra/db';
import { TicketRepository } from '../domain/TicketRepository';
import { NotaFiscalRepository } from '../domain/NotaFiscalRepository';
import { CepScsRepository } from '../domain/CepScsRepository';
import { TicketDescontoRepository } from '../domain/TicketDescontoRepository';
import { UserRepository } from '../../users/domain/UserRepository';
import { CreditRepository } from '../../creditos/domain/CreditRepository';
import { SerproClient } from '../../../integrations/serpro/SerproClient';

import { PgTicketRepository } from '../infra/PgTicketRepository';
import { PgNotaFiscalRepository } from '../infra/PgNotaFiscalRepository';
import { PgCepScsRepository } from '../infra/PgCepScsRepository';
import { PgTicketDescontoRepository } from '../infra/PgTicketDescontoRepository';
import { PgUserRepository } from '../../users/infra/PgUserRepository';
import { PgCreditRepository } from '../../creditos/infra/PgCreditRepository';
import { CreditMovement } from '../../creditos/domain/CreditMovement';
import { Ticket } from '../domain/Ticket';
import { v4 as uuidV4 } from 'uuid';

interface AplicarDescontoPorNfInput {
  ticketId: string;
  chaveNf: string;
  userId: string; // From auth, to ensure ownership and credit limit
}

interface AplicarDescontoPorNfOutput {
  ticketId: string;
  nfChave: string;
  valorNf: number;
  descontoAplicado: number; // No ticket
  creditoGerado: number; // No usuario
  valorTicketAntes: number;
  valorTicketDepois: number;
}

export class AplicarDescontoPorNf {
  // Logic: 5% of NF value, max 20.00
  // Discount = min(calc, 20.00)
  // Applied to Ticket = min(Discount, ticket.valorAtual)
  // Cashback = Discount - Applied
  private readonly PERCENTUAL_DESCONTO = 0.05;
  private readonly LIMIT_DESCONTO = 20.00;

  constructor(
    private readonly serproClient: SerproClient
  ) { }

  async executar(input: AplicarDescontoPorNfInput): Promise<AplicarDescontoPorNfOutput> {
    // 1. Serpro Query (Outside Tx to minimize lock time)
    const payloadSerpro = await this.serproClient.consultarNfe(input.chaveNf);
    const dadosNf = this.extrairDadosNf(payloadSerpro, input.chaveNf);

    const client: PoolClient = await pool.connect();

    try {
      await client.query('BEGIN');

      const ticketRepo = new PgTicketRepository(client);
      const nfRepo = new PgNotaFiscalRepository(client);
      const cepRepo = new PgCepScsRepository(client);
      const descontoRepo = new PgTicketDescontoRepository(client);
      const userRepo = new PgUserRepository(client);
      const creditRepo = new PgCreditRepository(client);

      // 2. Lock Ticket
      const ticket = await ticketRepo.buscarPorIdComLock(input.ticketId);
      if (!ticket) throw new Error('Ticket não encontrado.');

      if (ticket.userId !== input.userId) {
        throw new Error('Ticket não pertence ao usuário.');
      }

      if (ticket.status !== 'ABERTO') {
        throw new Error('Ticket deve estar ABERTO para aplicar desconto.');
      }

      // 3. Validation
      const cepAtivo = await cepRepo.verificarSeAtivo(dadosNf.cepDestinatario);
      if (!cepAtivo) throw new Error(`CEP ${dadosNf.cepDestinatario} não está ativo no sistema SCS.`);

      if (dadosNf.timestampNota < ticket.timestampEntrada || dadosNf.timestampNota > ticket.timestampSaida) {
        throw new Error('Timestamp da nota fiscal está fora do intervalo do ticket (entrada/saída).');
      }

      // 4. NF Idempotency
      const jaUsada = await nfRepo.verificarSeJaUsada(input.chaveNf);
      if (jaUsada) throw new Error('Nota fiscal já foi utilizada em outro ticket.');

      // Upsert NF
      await nfRepo.criarOuAtualizar({
        valorTotal: dadosNf.valorTotal,
        timestampNota: dadosNf.timestampNota,
        cepDestinatario: dadosNf.cepDestinatario,
        chave: dadosNf.chave,
        payload: dadosNf.payload
      });
      // Legacy mark used logic might be redundant if we check intersection with `ticket_descontos`, 
      // but let's update `usado_ticket_id` for consistency.
      await nfRepo.marcarComoUsada(input.chaveNf, ticket.id);


      // 5. Calculate Discount
      let descontoCalculado = Math.round(dadosNf.valorTotal * this.PERCENTUAL_DESCONTO * 100) / 100;
      descontoCalculado = Math.min(descontoCalculado, this.LIMIT_DESCONTO);

      const valorTicketAntes = ticket.valorAtual;
      const descontoAplicadoNoTicket = Math.min(descontoCalculado, valorTicketAntes);
      const creditoGerado = Math.round((descontoCalculado - descontoAplicadoNoTicket) * 100) / 100;

      // 6. Update Ticket
      const ticketAtualizado = ticket.aplicarDesconto(descontoAplicadoNoTicket);
      // We need to persist the updated ticket. 
      // Entity has logic to reduce value.
      await ticketRepo.atualizar(ticketAtualizado);

      // 7. Insert Discount Record
      await descontoRepo.criar({
        ticketId: ticket.id,
        nfChave: input.chaveNf,
        valorDesconto: descontoAplicadoNoTicket, // Legacy semantic
        descontoCalculado,
        descontoAplicadoNoTicket,
        creditoGerado
      });

      // 8. Handle Cashback
      if (creditoGerado > 0) {
        // Lock User ? Not strictly mandatory for increment if using UPDATE set balance = balance + val via repo
        // But our repo `atualizarSaldo` sets absolute value.
        // So we MUST fetch user to get current balance and update.
        // Or create `incrementarSaldo` method.
        // Since we didn't add `incrementarSaldo`, we do fetch + set.
        // To be safe against race condition on balance, LOCK user.
        // Is deadlock possible? Ticket Locked -> User Locked.
        // CriarTicket: User Locked -> Ticket Inserted.
        // Assume CreateTicket locks user THEN inserts ticket (doesn't lock ticket).
        // Here we lock ticket THEN user.
        // If CreateTicket locks User (T1) and waits for something?
        // CreateTicket doesn't wait for Ticket Lock because it creates new ticket.
        // Is there any flow that locks User then Ticket?
        // Creating Ticket locks User.
        // Applying Discount Locks Ticket.
        // No overlap on same Ticket instance (Create is new).
        // What if user creating ticket and applying discount on ANOTHER ticket same time?
        // T1 (Create): Lock User.
        // T2 (Discount): Lock Ticket A -> Lock User.
        // T2 will wait for T1.
        // T1 proceeds (Create Ticket B). Does T1 lock Ticket A? No.
        // T1 finishes. T2 proceeds.
        // SAFE.

        const user = await userRepo.buscarPorIdComLock(ticket.userId);
        if (user) {
          const novoSaldo = Number(user.creditoSaldo) + creditoGerado;
          await userRepo.atualizarSaldo(user.id, novoSaldo);

          await creditRepo.criar(CreditMovement.criar({
            id: uuidV4(),
            userId: user.id,
            tipo: 'CREDITO_SOBRA_DESCONTO',
            valor: creditoGerado,
            direcao: 'ENTRADA',
            referenciaTicketId: ticket.id,
            referenciaNfChave: input.chaveNf,
            descricao: `Sobra de desconto NF ${input.chaveNf}`,
            criadoEm: new Date()
          }));
        }
      }

      await client.query('COMMIT');

      return {
        ticketId: ticket.id,
        nfChave: input.chaveNf,
        valorNf: dadosNf.valorTotal,
        descontoAplicado: descontoAplicadoNoTicket,
        creditoGerado,
        valorTicketAntes,
        valorTicketDepois: ticketAtualizado.valorAtual,
      };

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  private extrairDadosNf(payload: unknown, chave: string): {
    valorTotal: number;
    timestampNota: Date;
    cepDestinatario: string;
    chave: string;
    payload: string;
  } {
    const nf = payload as any;

    // Extrair valor_total_nf
    let valorTotal = 0;
    if (nf?.nfeProc?.NFe?.infNFe?.total?.ICMSTot?.vNF) {
      valorTotal = Number(nf.nfeProc.NFe.infNFe.total.ICMSTot.vNF);
    } else if (nf?.nfeProc?.NFe?.infNFe?.total?.ICMSTot?.vProd) {
      valorTotal = Number(nf.nfeProc.NFe.infNFe.total.ICMSTot.vProd);
    } else {
      throw new Error('Não foi possível extrair valor_total da NF.');
    }

    // Extrair timestamp_nota (ordem de prioridade)
    let timestampStr: string | null = null;
    if (nf?.nfeProc?.NFe?.infNFe?.ide?.dhEmi) {
      timestampStr = nf.nfeProc.NFe.infNFe.ide.dhEmi;
    } else if (nf?.nfeProc?.NFe?.infNFe?.ide?.dhSaiEnt) {
      timestampStr = nf.nfeProc.NFe.infNFe.ide.dhSaiEnt;
    } else if (nf?.nfeProc?.protNFe?.infProt?.dhRecbto) {
      timestampStr = nf.nfeProc.protNFe.infProt.dhRecbto;
    }

    if (!timestampStr) {
      throw new Error('Não foi possível extrair timestamp da NF.');
    }

    const timestampNota = new Date(timestampStr);

    // Extrair CEP
    const cepRaw = nf?.nfeProc?.NFe?.infNFe?.dest?.enderDest?.CEP;

    if (!cepRaw) {
      throw new Error('Não foi possível extrair CEP do destinatário da NF.');
    }

    // Normalizar CEP (só dígitos, 8 chars)
    const cepNormalizado = String(cepRaw).replace(/\D/g, '');

    if (cepNormalizado.length !== 8) {
      throw new Error(`CEP inválido: ${cepRaw} (deve ter 8 dígitos).`);
    }

    return {
      valorTotal,
      timestampNota,
      cepDestinatario: cepNormalizado,
      chave,
      payload: JSON.stringify(payload)
    };
  }
}
