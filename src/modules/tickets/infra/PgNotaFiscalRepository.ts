import { Pool, PoolClient } from 'pg';
import { pool } from '../../../shared/infra/db';
import { NotaFiscalRepository } from '../domain/NotaFiscalRepository';

export class PgNotaFiscalRepository implements NotaFiscalRepository {
  private db: Pool | PoolClient;

  constructor(db?: Pool | PoolClient) {
    this.db = db || pool;
  }

  async criarOuAtualizar(dados: { valorTotal: number; timestampNota: Date; cepDestinatario: string; chave: string; payload: string }): Promise<void> {
    const query = `
      INSERT INTO notas_fiscais (chave, valor_total, timestamp_nota, cep_destinatario, payload)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (chave) DO NOTHING
    `;
    const values = [dados.chave, dados.valorTotal, dados.timestampNota, dados.cepDestinatario, dados.payload];
    await this.db.query(query, values);
  }

  async verificarSeJaUsada(chave: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM ticket_descontos WHERE nf_chave = $1
    `;
    const result = await this.db.query(query, [chave]);
    return result.rows.length > 0;
  }

  /* 
     Legacy method used in previous implementation for "marking" logic.
     In new logic, existence in ticket_descontos IS the check.
     But we might still want to link it to a ticket in notas_fiscais table if schema requires `usado_ticket_id`.
     The schema has `usado_ticket_id` in `notas_fiscais`.
     AND `ticket_descontos` table.
     So we have redundancy. We should update `usado_ticket_id` too for consistency.
  */
  async marcarComoUsada(chave: string, ticketId: string): Promise<boolean> {
    const query = `
      UPDATE notas_fiscais
      SET usado_ticket_id = $2, usada_em = now()
      WHERE chave = $1 AND usado_ticket_id IS NULL
    `;
    const result = await this.db.query(query, [chave, ticketId]);
    return result.rowCount !== null && result.rowCount > 0;
  }
}
