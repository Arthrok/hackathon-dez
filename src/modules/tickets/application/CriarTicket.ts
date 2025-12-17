import { randomUUID } from 'crypto';
import { Ticket } from '../domain/Ticket';
import { TicketRepository } from '../domain/TicketRepository';
import { TicketTipoRepository } from '../domain/TicketTipoRepository';

interface CriarTicketInput {
  tipoHoras: number;
  timestampEntrada: Date;
  placaDoCarro: string;
}

interface CriarTicketOutput {
  id: string;
  status: string;
  valorOriginal: number;
  valorAtual: number;
  timestampEntrada: Date;
  timestampSaida: Date;
  placaDoCarro: string;
}

export class CriarTicket {
  private readonly PRECO_POR_HORA = 5.75;

  constructor(
    private readonly ticketRepo: TicketRepository,
    private readonly tipoRepo: TicketTipoRepository
  ) {}

  async executar(input: CriarTicketInput): Promise<CriarTicketOutput> {
    const tipo = await this.tipoRepo.buscarPorHoras(input.tipoHoras);

    if (!tipo) {
      throw new Error(`Tipo de ticket com ${input.tipoHoras} horas não encontrado.`);
    }

    const timestampSaida = new Date(input.timestampEntrada);
    timestampSaida.setHours(timestampSaida.getHours() + input.tipoHoras);

    const valorOriginal = tipo.valorTotal;

    const ticket = Ticket.create({
      id: randomUUID(),
      tipoId: tipo.id,
      valorOriginal,
      timestampEntrada: input.timestampEntrada,
      timestampSaida,
      placaDoCarro: input.placaDoCarro,
    });

    await this.ticketRepo.criar(ticket);

    return {
      id: ticket.id,
      status: ticket.status,
      valorOriginal: ticket.valorOriginal,
      valorAtual: ticket.valorAtual,
      timestampEntrada: ticket.timestampEntrada,
      timestampSaida: ticket.timestampSaida,
      placaDoCarro: ticket.placaDoCarro,
    };
  }
}

