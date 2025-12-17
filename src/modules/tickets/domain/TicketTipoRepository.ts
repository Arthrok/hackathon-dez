import { TicketTipo } from './TicketTipo';

export interface TicketTipoRepository {
  buscarPorHoras(horas: number): Promise<TicketTipo | null>;
  buscarTodos(): Promise<TicketTipo[]>;
}
