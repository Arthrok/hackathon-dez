export interface TicketDesconto {
  id: string;
  ticketId: string;
  nfChave: string;
  valorDesconto: number;
  aplicadoEm: Date;
}

export interface TicketDescontoRepository {
  criar(desconto: Omit<TicketDesconto, 'id' | 'aplicadoEm'>): Promise<TicketDesconto>;
  buscarPorTicketId(ticketId: string): Promise<TicketDesconto[]>;
}

