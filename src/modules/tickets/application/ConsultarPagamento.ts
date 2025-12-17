import { TicketRepository } from '../domain/TicketRepository';

interface ConsultarPagamentoOutput {
  ticketId: string;
  status: string;
  valorAPagar: number;
}

export class ConsultarPagamento {
  constructor(private readonly repo: TicketRepository) {}

  async executar(ticketId: string): Promise<ConsultarPagamentoOutput | null> {
    const ticket = await this.repo.buscarPorId(ticketId);

    if (!ticket) {
      return null;
    }

    return {
      ticketId: ticket.id,
      status: ticket.status,
      valorAPagar: ticket.valorAtual,
    };
  }
}

