export interface NotaFiscalRepository {
  criarOuAtualizar(dados: {
    valorTotal: number;
    timestampNota: Date;
    cepDestinatario: string;
    chave: string;
    payload: string;
  }): Promise<void>;

  verificarSeJaUsada(chave: string): Promise<boolean>;

  marcarComoUsada(chave: string, ticketId: string): Promise<boolean>;
}
