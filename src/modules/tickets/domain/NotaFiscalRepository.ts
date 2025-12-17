export interface NotaFiscalData {
  chave: string;
  valorTotal: number;
  timestampNota: Date;
  cepDestinatario: string;
  payload: unknown;
}

export interface NotaFiscalRepository {
  buscarPorChave(chave: string): Promise<NotaFiscalData | null>;
  criarOuAtualizar(data: NotaFiscalData): Promise<void>;
  marcarComoUsada(chave: string, ticketId: string): Promise<boolean>;
  verificarSeJaUsada(chave: string): Promise<boolean>;
}

