import { Ticket } from './Ticket';

export interface TicketRepository {
  criar(ticket: Ticket): Promise<void>;
  buscarPorId(id: string): Promise<Ticket | null>;
  buscarPorIdComLock(id: string): Promise<Ticket | null>;
  atualizar(ticket: Ticket): Promise<void>;

  // New methods
  listarPorUsuario(userId: string, params: { status?: string, limit: number, offset: number }): Promise<Ticket[]>;
  buscarAtivoPorUsuario(userId: string): Promise<Ticket | null>;
  excluir(ticketId: string): Promise<void>;
}

