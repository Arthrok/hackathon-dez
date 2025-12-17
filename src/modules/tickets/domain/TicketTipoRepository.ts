import { TicketTipo } from './TicketTipo';

export interface TicketTipoRepository {
  buscarTodos(): Promise<TicketTipo[]>;
  buscarPorHoras(horas: number): Promise<TicketTipo | null>;
}

