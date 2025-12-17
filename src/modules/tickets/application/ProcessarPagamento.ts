import { TicketRepository } from '../domain/TicketRepository';
import { TicketPagamentoRepository } from '../domain/TicketPagamentoRepository';

interface ProcessarPagamentoInput {
  ticketId: string;
  userId: string;
  metodo?: string;
  idempotencyKey?: string;
}

interface ProcessarPagamentoOutput {
  ticketId: string;
  status: string;
  valorPago: number;
  pagoEm: Date;
}

export class ProcessarPagamento {
  constructor(
    private readonly ticketRepo: TicketRepository,
    private readonly pagamentoRepo: TicketPagamentoRepository
  ) { }

  async executar(input: ProcessarPagamentoInput): Promise<ProcessarPagamentoOutput> {
    // Buscar ticket com lock
    const ticket = await this.ticketRepo.buscarPorIdComLock(input.ticketId);

    if (!ticket) {
      throw new Error('Ticket não encontrado.');
    }

    if (ticket.userId !== input.userId) {
      throw new Error('Ticket não pertence ao usuário.');
    }

    if (ticket.status !== 'ABERTO') {
      throw new Error('Ticket deve estar ABERTO para ser pago.');
    }

    // Verificar idempotência
    if (input.idempotencyKey) {
      const pagamentoExistente = await this.pagamentoRepo.buscarPorIdempotencyKey(
        input.idempotencyKey
      );

      if (pagamentoExistente) {
        return {
          ticketId: ticket.id,
          status: 'PAGO',
          valorPago: pagamentoExistente.valorPago,
          pagoEm: pagamentoExistente.pagoEm,
        };
      }
    }

    const valorPago = ticket.valorAtual;

    // Criar registro de pagamento
    const pagamento = await this.pagamentoRepo.criar({
      ticketId: ticket.id,
      valorPago,
      metodo: input.metodo ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
    });

    // Atualizar ticket para PAGO
    const ticketPago = ticket.pagar();
    await this.ticketRepo.atualizar(ticketPago);

    return {
      ticketId: ticket.id,
      status: 'PAGO',
      valorPago,
      pagoEm: pagamento.pagoEm,
    };
  }
}

