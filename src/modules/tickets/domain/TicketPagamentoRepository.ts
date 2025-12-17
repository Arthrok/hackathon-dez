export interface TicketPagamento {
  id: string;
  ticketId: string;
  valorPago: number;
  pagoEm: Date;
  metodo: string | null;
  idempotencyKey: string | null;
  status: string;
}

export interface TicketPagamentoRepository {
  criar(pagamento: Omit<TicketPagamento, 'id' | 'pagoEm' | 'status'>): Promise<TicketPagamento>;
  buscarPorIdempotencyKey(idempotencyKey: string): Promise<TicketPagamento | null>;
}

