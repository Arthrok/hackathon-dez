import { pool } from '../../../db/pg';
import { NotaFiscal } from '../domain/NotaFiscal';
import { NotaFiscalRepository } from '../domain/NotaFiscalRepository';

export class PgNotaFiscalRepository implements NotaFiscalRepository {
  async criar(nota: NotaFiscal): Promise<void> {
    const query = `
      INSERT INTO nota_fiscal (id, numero, emitente, valor_total, criada_em)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [nota.id, nota.numero, nota.emitente, nota.valorTotal, nota.criadaEm.toISOString()];

    await pool.query(query, values);
  }

  async buscarPorId(id: string): Promise<NotaFiscal | null> {
    const query = `
      SELECT id, numero, emitente, valor_total, criada_em
      FROM nota_fiscal
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return NotaFiscal.create({
      id: row.id,
      numero: row.numero,
      emitente: row.emitente,
      valorTotal: Number(row.valor_total),
      criadaEm: new Date(row.criada_em),
    });
  }
}


