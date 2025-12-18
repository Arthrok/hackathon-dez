import { Pool, PoolClient } from 'pg';
import { pool } from '../../../shared/infra/db';
import { Ticket } from '../domain/Ticket';
import { TicketRepository } from '../domain/TicketRepository';

export class PgTicketRepository implements TicketRepository {
  private db: Pool | PoolClient;

  constructor(db?: Pool | PoolClient) {
    this.db = db || pool;
  }

  async criar(ticket: Ticket): Promise<void> {
    const query = `
      INSERT INTO tickets (id, user_id, tipo_id, status, valor_original, valor_atual, timestamp_entrada, timestamp_saida, placa_do_carro, criado_em)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    const values = [
      ticket.id,
      ticket.userId,
      ticket.tipoId,
      ticket.status,
      ticket.valorOriginal,
      ticket.valorAtual,
      ticket.timestampEntrada.toISOString(),
      ticket.timestampSaida.toISOString(),
      ticket.placaDoCarro,
      ticket.criadoEm.toISOString(),
    ];

    await this.db.query(query, values);
  }

  async buscarPorId(id: string): Promise<Ticket | null> {
    const query = `
      SELECT id, user_id, tipo_id, status, valor_original, valor_atual, timestamp_entrada, timestamp_saida, placa_do_carro, criado_em
      FROM tickets
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTicket(result.rows[0]);
  }

  async buscarPorIdComLock(id: string): Promise<Ticket | null> {
    const query = `
      SELECT id, user_id, tipo_id, status, valor_original, valor_atual, timestamp_entrada, timestamp_saida, placa_do_carro, criado_em
      FROM tickets
      WHERE id = $1
      FOR UPDATE
    `;

    const result = await this.db.query(query, [id]);

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

    await this.db.query(query, [ticket.id, ticket.status, ticket.valorAtual]);
  }

  async listarPorUsuario(userId: string, params: { status?: string, limit: number, offset: number }): Promise<Ticket[]> {
    let query = `
      SELECT * FROM tickets
      WHERE user_id = $1
    `;
    const values: any[] = [userId];
    let counter = 2;

    if (params.status) {
      query += ` AND status = $${counter}`;
      values.push(params.status);
      counter++;
    }

    query += ` ORDER BY criado_em DESC LIMIT $${counter} OFFSET $${counter + 1}`;
    values.push(params.limit, params.offset);

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRowToTicket(row));
  }

  async buscarAtivoPorUsuario(userId: string): Promise<Ticket | null> {
    const query = `
      SELECT * FROM tickets
      WHERE user_id = $1 AND status = 'ABERTO'
      ORDER BY criado_em DESC
      LIMIT 1
    `;
    const result = await this.db.query(query, [userId]);
    if (result.rows.length === 0) return null;
    return this.mapRowToTicket(result.rows[0]);
  }

  async excluir(ticketId: string): Promise<void> {
    await this.db.query('DELETE FROM tickets WHERE id = $1', [ticketId]);
  }

  private mapRowToTicket(row: any): Ticket {
    // Note: Ticket.reconstruir expects userId now.
    return Ticket.reconstruir({
      id: row.id,
      userId: row.user_id,
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
