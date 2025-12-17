import { Ticket } from '../domain/Ticket';
import { TicketRepository } from '../domain/TicketRepository';
import { NotaFiscalRepository } from '../domain/NotaFiscalRepository';
import { CepScsRepository } from '../domain/CepScsRepository';
import { TicketDescontoRepository } from '../domain/TicketDescontoRepository';
import { SerproClient } from '../../../integrations/serpro/SerproClient';

interface AplicarDescontoPorNfInput {
  ticketId: string;
  chaveNf: string;
}

interface AplicarDescontoPorNfOutput {
  ticketId: string;
  nfChave: string;
  valorNf: number;
  descontoAplicado: number;
  valorTicketAntes: number;
  valorTicketDepois: number;
}

export class AplicarDescontoPorNf {
  private readonly PERCENTUAL_DESCONTO = 0.1;

  constructor(
    private readonly ticketRepo: TicketRepository,
    private readonly notaFiscalRepo: NotaFiscalRepository,
    private readonly cepScsRepo: CepScsRepository,
    private readonly descontoRepo: TicketDescontoRepository,
    private readonly serproClient: SerproClient
  ) {}

  async executar(input: AplicarDescontoPorNfInput): Promise<AplicarDescontoPorNfOutput> {
    // Buscar ticket com lock
    const ticket = await this.ticketRepo.buscarPorIdComLock(input.ticketId);

    if (!ticket) {
      throw new Error('Ticket não encontrado.');
    }

    if (ticket.status !== 'ABERTO') {
      throw new Error('Ticket deve estar ABERTO para aplicar desconto.');
    }

    // Consultar SERPRO
    const payloadSerpro = await this.serproClient.consultarNfe(input.chaveNf);

    // Extrair dados da NF
    const dadosNf = this.extrairDadosNf(payloadSerpro, input.chaveNf);

    // Validar CEP
    const cepAtivo = await this.cepScsRepo.verificarSeAtivo(dadosNf.cepDestinatario);

    if (!cepAtivo) {
      throw new Error(`CEP ${dadosNf.cepDestinatario} não está ativo no sistema SCS.`);
    }

    // Validar timestamp da NF dentro do intervalo do ticket
    if (
      dadosNf.timestampNota < ticket.timestampEntrada ||
      dadosNf.timestampNota > ticket.timestampSaida
    ) {
      throw new Error(
        'Timestamp da nota fiscal está fora do intervalo do ticket (entrada/saída).'
      );
    }

    // Verificar se NF já foi usada (com lock via update condicional)
    const jaUsada = await this.notaFiscalRepo.verificarSeJaUsada(input.chaveNf);

    if (jaUsada) {
      throw new Error('Nota fiscal já foi utilizada em outro ticket.');
    }

    // Persistir NF (upsert)
    await this.notaFiscalRepo.criarOuAtualizar({
      valorTotal: dadosNf.valorTotal,
      timestampNota: dadosNf.timestampNota,
      cepDestinatario: dadosNf.cepDestinatario,
      chave: dadosNf.chave,
      payload: dadosNf.payload
    });

    // Marcar como usada por este ticket (com lock)
    const marcado = await this.notaFiscalRepo.marcarComoUsada(input.chaveNf, ticket.id);

    if (!marcado) {
      throw new Error('Nota fiscal já foi utilizada (concorrência).');
    }

    // Calcular desconto
    const desconto = Math.round(dadosNf.valorTotal * this.PERCENTUAL_DESCONTO * 100) / 100;

    const valorTicketAntes = ticket.valorAtual;

    // Aplicar desconto no ticket
    const ticketAtualizado = ticket.aplicarDesconto(desconto);

    await this.ticketRepo.atualizar(ticketAtualizado);

    // Registrar desconto
    await this.descontoRepo.criar({
      ticketId: ticket.id,
      nfChave: input.chaveNf,
      valorDesconto: desconto,
    });

    return {
      ticketId: ticket.id,
      nfChave: input.chaveNf,
      valorNf: dadosNf.valorTotal,
      descontoAplicado: desconto,
      valorTicketAntes,
      valorTicketDepois: ticketAtualizado.valorAtual,
    };
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

