import { pool } from '../../../db/pg';
import { Ticket, TicketStatus } from '../domain/Ticket';
import { TicketRepository } from '../domain/TicketRepository';

export class PgTicketRepository implements TicketRepository {
  async criar(ticket: Ticket): Promise<void> {
    const query = `
      INSERT INTO tickets (id, tipo_id, status, valor_original, valor_atual, timestamp_entrada, timestamp_saida, placa_do_carro, criado_em)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const values = [
      ticket.id,
      ticket.tipoId,
      ticket.status,
      ticket.valorOriginal,
      ticket.valorAtual,
      ticket.timestampEntrada.toISOString(),
      ticket.timestampSaida.toISOString(),
      ticket.placaDoCarro,
      ticket.criadoEm.toISOString(),
    ];

    await pool.query(query, values);
  }

  async buscarPorId(id: string): Promise<Ticket | null> {
    const query = `
      SELECT id, tipo_id, status, valor_original, valor_atual, timestamp_entrada, timestamp_saida, placa_do_carro, criado_em
      FROM tickets
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTicket(result.rows[0]);
  }

  async buscarPorIdComLock(id: string): Promise<Ticket | null> {
    const query = `
      SELECT id, tipo_id, status, valor_original, valor_atual, timestamp_entrada, timestamp_saida, placa_do_carro, criado_em
      FROM tickets
      WHERE id = $1
      FOR UPDATE
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTicket(result.rows[0]);
  }

  async atualizar(ticket: Ticket): Promise<void> {
    const query = `
      UPDATE tickets
      SET status = $2, valor_atual = $3
      WHERE id = $1
    `;

    await pool.query(query, [ticket.id, ticket.status, ticket.valorAtual]);
  }

  private mapRowToTicket(row: any): Ticket {
    return Ticket.reconstruir({
      id: row.id,
      tipoId: row.tipo_id,
      status: row.status as 'ABERTO' | 'PAGO' | 'CANCELADO',
      valorOriginal: Number(row.valor_original),
      valorAtual: Number(row.valor_atual),
      timestampEntrada: new Date(row.timestamp_entrada),
      timestampSaida: new Date(row.timestamp_saida),
      placaDoCarro: row.placa_do_carro,
      criadoEm: new Date(row.criado_em),
    });
  }
}

