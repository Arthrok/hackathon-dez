import { pool } from '../../../db/pg';
import { TicketTipo } from '../domain/TicketTipo';
import { TicketTipoRepository } from '../domain/TicketTipoRepository';

export class PgTicketTipoRepository implements TicketTipoRepository {
  async buscarTodos(): Promise<TicketTipo[]> {
    const query = 'SELECT id, horas, preco_por_hora FROM ticket_tipos ORDER BY horas';

    const result = await pool.query(query);

    return result.rows.map((row) =>
      TicketTipo.create({
        id: row.id,
        horas: row.horas,
        precoPorHora: Number(row.preco_por_hora),
      })
    );
  }

  async buscarPorHoras(horas: number): Promise<TicketTipo | null> {
    const query = 'SELECT id, horas, preco_por_hora FROM ticket_tipos WHERE horas = $1';

    const result = await pool.query(query, [horas]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return TicketTipo.create({
      id: row.id,
      horas: row.horas,
      precoPorHora: Number(row.preco_por_hora),
    });
  }
}

