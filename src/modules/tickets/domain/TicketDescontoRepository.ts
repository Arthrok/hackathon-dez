export interface TicketDescontoRepository {
  criar(dados: {
    ticketId: string;
    nfChave: string;
    valorDesconto: number;
    descontoCalculado: number;
    descontoAplicadoNoTicket: number;
    creditoGerado: number;
  }): Promise<void>;

  listarPorTicket(ticketId: string): Promise<any[]>; // Use specific type if possible
}
