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

      // 2. Lock User (to ensure we can check active ticket and update balance safely)
      // Actually, to check active ticket we query tickets. 
      // User requested "assuma que sempre vá ter apenas um ticket ativo". 
      // We should look for it. Use ticketRepo.buscarAtivoPorUsuario.

      // We need to associate the NF usage to a ticket? Yes, usually.

      const ticket = await ticketRepo.buscarAtivoPorUsuario(input.userId);
      if (!ticket) {
        throw new Error('Nenhum ticket ativo encontrado para este usuário.');
      }

      // We prefer to lock the ticket row to prevent concurrent updates on it (e.g. paying/cancelling while applying cashback)
      // Re-fetch with lock using ID from the found active ticket.
      const ticketLocked = await ticketRepo.buscarPorIdComLock(ticket.id);
      if (!ticketLocked || ticketLocked.status !== 'ABERTO') {
        throw new Error('Ticket não está mais ativo/aberto.');
      }

      // 3. Validation
      const cepAtivo = await cepRepo.verificarSeAtivo(dadosNf.cepDestinatario);
      if (!cepAtivo) throw new Error(`CEP ${dadosNf.cepDestinatario} não está ativo no sistema SCS.`);

      if (dadosNf.timestampNota < ticketLocked.timestampEntrada || dadosNf.timestampNota > ticketLocked.timestampSaida) {
        throw new Error(`Timestamp da nota fiscal (${dadosNf.timestampNota.toISOString()}) está fora do intervalo do ticket (${ticketLocked.timestampEntrada.toISOString()} - ${ticketLocked.timestampSaida.toISOString()}).`);
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
      await nfRepo.marcarComoUsada(input.chaveNf, ticketLocked.id);


      // 5. Calculate Cashback (5% max 20.00)
      let cashbackCalculado = Math.round(dadosNf.valorTotal * this.PERCENTUAL_DESCONTO * 100) / 100;
      cashbackCalculado = Math.min(cashbackCalculado, this.LIMIT_DESCONTO);

      // ticket is pre-paid, so we DO NOT reduce ticket value. 
      // We Just add credit to user.
      const descontoAplicadoNoTicket = 0; // Explicitly 0
      const creditoGerado = cashbackCalculado; // Full amount is cashback

      // 6. Update Ticket? No change in values.
      // But we might want to log this "discount" in ticket_descontos table.

      // 7. Insert Discount Record (keeping table name 'ticket_descontos' but treating as cashback record)
      await descontoRepo.criar({
        ticketId: ticketLocked.id,
        nfChave: input.chaveNf,
        valorDesconto: 0, // No discount on ticket
        descontoCalculado: cashbackCalculado,
        descontoAplicadoNoTicket: 0,
        creditoGerado
      });

      // 8. Handle Cashback
      if (creditoGerado > 0) {
        const user = await userRepo.buscarPorIdComLock(ticketLocked.userId);
        if (user) {
          const novoSaldo = Number(user.creditoSaldo) + creditoGerado;
          await userRepo.atualizarSaldo(user.id, novoSaldo);

          await creditRepo.criar(CreditMovement.criar({
            id: uuidV4(),
            userId: user.id,
            tipo: 'CREDITO_SOBRA_DESCONTO', // Reuse type or create new? 'CREDITO_CASHBACK_NF' matches intention better? Reuse for now or string.
            valor: creditoGerado,
            direcao: 'ENTRADA',
            referenciaTicketId: ticketLocked.id,
            referenciaNfChave: input.chaveNf,
            descricao: `Cashback NF ${input.chaveNf}`,
            criadoEm: new Date()
          }));
        }
      }

      await client.query('COMMIT');

      return {
        ticketId: ticketLocked.id,
        nfChave: input.chaveNf,
        valorNf: dadosNf.valorTotal,
        descontoAplicado: 0,
        creditoGerado,
        valorTicketAntes: ticketLocked.valorAtual,
        valorTicketDepois: ticketLocked.valorAtual,
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
