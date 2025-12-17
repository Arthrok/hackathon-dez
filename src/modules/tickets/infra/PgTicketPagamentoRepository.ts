import { pool } from '../../../db/pg';
import { TicketPagamentoRepository, TicketPagamento } from '../domain/TicketPagamentoRepository';

export class PgTicketPagamentoRepository implements TicketPagamentoRepository {
  async criar(pagamento: Omit<TicketPagamento, 'id' | 'pagoEm' | 'status'>): Promise<TicketPagamento> {
    const query = `
      INSERT INTO ticket_pagamentos (ticket_id, valor_pago, metodo, idempotency_key, status)
      VALUES ($1, $2, $3, $4, 'CONFIRMADO')
      RETURNING id, ticket_id, valor_pago, pago_em, metodo, idempotency_key, status
    `;

    const result = await pool.query(query, [
      pagamento.ticketId,
      pagamento.valorPago,
      pagamento.metodo,
      pagamento.idempotencyKey,
    ]);

    const row = result.rows[0];

    return {
      id: row.id,
      ticketId: row.ticket_id,
      valorPago: Number(row.valor_pago),
      pagoEm: new Date(row.pago_em),
      metodo: row.metodo,
      idempotencyKey: row.idempotency_key,
      status: row.status,
    };
  }

  async buscarPorIdempotencyKey(idempotencyKey: string): Promise<TicketPagamento | null> {
    const query = `
      SELECT id, ticket_id, valor_pago, pago_em, metodo, idempotency_key, status
      FROM ticket_pagamentos
      WHERE idempotency_key = $1
    `;

    const result = await pool.query(query, [idempotencyKey]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      ticketId: row.ticket_id,
      valorPago: Number(row.valor_pago),
      pagoEm: new Date(row.pago_em),
      metodo: row.metodo,
      idempotencyKey: row.idempotency_key,
      status: row.status,
    };
  }
}

