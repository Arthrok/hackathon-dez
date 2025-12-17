import { pool } from '../../../db/pg';
import { NotaFiscalRepository, NotaFiscalData } from '../domain/NotaFiscalRepository';

export class PgNotaFiscalRepository implements NotaFiscalRepository {
  async buscarPorChave(chave: string): Promise<NotaFiscalData | null> {
    const query = `
      SELECT chave, valor_total, timestamp_nota, cep_destinatario, payload
      FROM notas_fiscais
      WHERE chave = $1
    `;

    const result = await pool.query(query, [chave]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      chave: row.chave,
      valorTotal: Number(row.valor_total),
      timestampNota: new Date(row.timestamp_nota),
      cepDestinatario: row.cep_destinatario,
      payload: row.payload,
    };
  }

  async criarOuAtualizar(data: NotaFiscalData): Promise<void> {
    const query = `
      INSERT INTO notas_fiscais (chave, valor_total, timestamp_nota, cep_destinatario, payload)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (chave) DO UPDATE
      SET valor_total = EXCLUDED.valor_total,
          timestamp_nota = EXCLUDED.timestamp_nota,
          cep_destinatario = EXCLUDED.cep_destinatario,
          payload = EXCLUDED.payload
    `;

    await pool.query(query, [
      data.chave,
      data.valorTotal,
      data.timestampNota.toISOString(),
      data.cepDestinatario,
      JSON.stringify(data.payload),
    ]);
  }

  async marcarComoUsada(chave: string, ticketId: string): Promise<boolean> {
    // Update condicional: só marca se usado_ticket_id ainda for NULL
    const query = `
      UPDATE notas_fiscais
      SET usado_ticket_id = $2, usada_em = now()
      WHERE chave = $1 AND usado_ticket_id IS NULL
      RETURNING chave
    `;

    const result = await pool.query(query, [chave, ticketId]);

    return result.rows.length > 0;
  }

  async verificarSeJaUsada(chave: string): Promise<boolean> {
    const query = `
      SELECT usado_ticket_id
      FROM notas_fiscais
      WHERE chave = $1 AND usado_ticket_id IS NOT NULL
    `;

    const result = await pool.query(query, [chave]);

    return result.rows.length > 0;
  }
}

