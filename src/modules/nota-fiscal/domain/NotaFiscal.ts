export interface NotaFiscalProps {
  id: string;
  numero: string;
  emitente: string;
  valorTotal: number;
  criadaEm: Date;
}

export class NotaFiscal {
  public readonly id: string;
  public readonly numero: string;
  public readonly emitente: string;
  public readonly valorTotal: number;
  public readonly criadaEm: Date;

  private constructor(props: NotaFiscalProps) {
    this.id = props.id;
    this.numero = props.numero;
    this.emitente = props.emitente;
    this.valorTotal = props.valorTotal;
    this.criadaEm = props.criadaEm;
  }

  static create(params: { id: string; numero: string; emitente: string; valorTotal: number; criadaEm?: Date }): NotaFiscal {
    if (!params.numero || !params.emitente) {
      throw new Error('Número e emitente são obrigatórios.');
    }

    if (params.valorTotal < 0) {
      throw new Error('valorTotal deve ser maior ou igual a 0.');
    }

    return new NotaFiscal({
      id: params.id,
      numero: params.numero,
      emitente: params.emitente,
      valorTotal: params.valorTotal,
      criadaEm: params.criadaEm ?? new Date(),
    });
  }
}


