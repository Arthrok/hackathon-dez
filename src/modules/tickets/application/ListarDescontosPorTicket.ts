import { TicketDescontoRepository } from '../domain/TicketDescontoRepository';

interface DescontoOutput {
  id: string;
  nfChave: string;
  valorDesconto: number;
  aplicadoEm: Date;
}

export class ListarDescontosPorTicket {
  constructor(private readonly repo: TicketDescontoRepository) { }

  async executar(ticketId: string): Promise<DescontoOutput[]> {
    const descontos = await this.repo.listarPorTicket(ticketId);

    return descontos.map((d: any) => ({
      id: d.id,
      nfChave: d.nfChave,
      valorDesconto: d.valorDesconto,
      aplicadoEm: d.aplicadoEm,
    }));
  }
}

