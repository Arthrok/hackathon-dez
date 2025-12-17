import { Ticket } from '../domain/Ticket';
import { TicketRepository } from '../domain/TicketRepository';

interface BuscarTicketPorIdOutput {
  id: string;
  status: string;
  valorOriginal: number;
  valorAtual: number;
  timestampEntrada: Date;
  timestampSaida: Date;
  placaDoCarro: string;
  criadoEm: Date;
}

export class BuscarTicketPorId {
  constructor(private readonly repo: TicketRepository) { }

  async executar(id: string, userId: string): Promise<BuscarTicketPorIdOutput | null> {
    const ticket = await this.repo.buscarPorId(id);

    if (!ticket) {
      return null;
    }

    if (ticket.userId !== userId) {
      // Return null or throw error depending on desired behavior. 
      // User requested "só dono". Return null mimics "not found".
      return null;
    }

    return {
      id: ticket.id,
      status: ticket.status,
      valorOriginal: ticket.valorOriginal,
      valorAtual: ticket.valorAtual,
      timestampEntrada: ticket.timestampEntrada,
      timestampSaida: ticket.timestampSaida,
      placaDoCarro: ticket.placaDoCarro,
      criadoEm: ticket.criadoEm,
    };
  }
}

