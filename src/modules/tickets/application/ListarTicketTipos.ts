import { TicketTipo } from '../domain/TicketTipo';
import { TicketTipoRepository } from '../domain/TicketTipoRepository';

export interface TicketTipoOutput {
  id: string;
  horas: number;
  precoPorHora: number;
  valorTotal: number;
}

export class ListarTicketTipos {
  constructor(private readonly repo: TicketTipoRepository) {}

  async executar(): Promise<TicketTipoOutput[]> {
    const tipos = await this.repo.buscarTodos();

    return tipos.map((tipo) => ({
      id: tipo.id,
      horas: tipo.horas,
      precoPorHora: tipo.precoPorHora,
      valorTotal: tipo.valorTotal,
    }));
  }
}

