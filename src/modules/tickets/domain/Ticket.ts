export type TicketStatus = 'ABERTO' | 'PAGO' | 'CANCELADO';

export interface TicketProps {
  id: string;
  tipoId: string;
  status: TicketStatus;
  valorOriginal: number;
  valorAtual: number;
  timestampEntrada: Date;
  timestampSaida: Date;
  placaDoCarro: string;
  criadoEm: Date;
}

export class Ticket {
  public readonly id: string;
  public readonly tipoId: string;
  public readonly status: TicketStatus;
  public readonly valorOriginal: number;
  public readonly valorAtual: number;
  public readonly timestampEntrada: Date;
  public readonly timestampSaida: Date;
  public readonly placaDoCarro: string;
  public readonly criadoEm: Date;

  private constructor(props: TicketProps) {
    this.id = props.id;
    this.tipoId = props.tipoId;
    this.status = props.status;
    this.valorOriginal = props.valorOriginal;
    this.valorAtual = props.valorAtual;
    this.timestampEntrada = props.timestampEntrada;
    this.timestampSaida = props.timestampSaida;
    this.placaDoCarro = props.placaDoCarro;
    this.criadoEm = props.criadoEm;
  }

  static create(params: {
    id: string;
    tipoId: string;
    valorOriginal: number;
    timestampEntrada: Date;
    timestampSaida: Date;
    placaDoCarro: string;
    criadoEm?: Date;
  }): Ticket {
    if (!params.placaDoCarro || params.placaDoCarro.trim().length === 0) {
      throw new Error('Placa do carro é obrigatória.');
    }

    if (params.valorOriginal < 0) {
      throw new Error('Valor original deve ser maior ou igual a 0.');
    }

    if (params.timestampSaida <= params.timestampEntrada) {
      throw new Error('Timestamp de saída deve ser posterior ao de entrada.');
    }

    return new Ticket({
      id: params.id,
      tipoId: params.tipoId,
      status: 'ABERTO',
      valorOriginal: params.valorOriginal,
      valorAtual: params.valorOriginal,
      timestampEntrada: params.timestampEntrada,
      timestampSaida: params.timestampSaida,
      placaDoCarro: params.placaDoCarro,
      criadoEm: params.criadoEm ?? new Date(),
    });
  }

  static reconstruir(props: TicketProps): Ticket {
    return new Ticket(props);
  }

  aplicarDesconto(valorDesconto: number): Ticket {
    if (this.status !== 'ABERTO') {
      throw new Error('Ticket deve estar ABERTO para aplicar desconto.');
    }

    if (valorDesconto < 0) {
      throw new Error('Valor do desconto deve ser maior ou igual a 0.');
    }

    const novoValorAtual = Math.max(this.valorAtual - valorDesconto, 0);

    return new Ticket({
      ...this,
      valorAtual: novoValorAtual,
    });
  }

  pagar(): Ticket {
    if (this.status !== 'ABERTO') {
      throw new Error('Ticket deve estar ABERTO para ser pago.');
    }

    return new Ticket({
      ...this,
      status: 'PAGO',
    });
  }
}

