export interface TicketTipoProps {
  id: string;
  horas: number;
  precoPorHora: number;
}

export class TicketTipo {
  public readonly id: string;
  public readonly horas: number;
  public readonly precoPorHora: number;

  private constructor(props: TicketTipoProps) {
    this.id = props.id;
    this.horas = props.horas;
    this.precoPorHora = props.precoPorHora;
  }

  static create(props: TicketTipoProps): TicketTipo {
    if (![1, 2, 3, 4].includes(props.horas)) {
      throw new Error('Horas deve ser 1, 2, 3 ou 4.');
    }

    if (props.precoPorHora <= 0) {
      throw new Error('Preço por hora deve ser maior que 0.');
    }

    return new TicketTipo(props);
  }

  get valorTotal(): number {
    return this.horas * this.precoPorHora;
  }
}

