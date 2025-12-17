import { pool } from '../../../db/pg';
import { TicketDescontoRepository, TicketDesconto } from '../domain/TicketDescontoRepository';

export class PgTicketDescontoRepository implements TicketDescontoRepository {
  async criar(desconto: Omit<TicketDesconto, 'id' | 'aplicadoEm'>): Promise<TicketDesconto> {
    const query = `
      INSERT INTO ticket_descontos (ticket_id, nf_chave, valor_desconto)
      VALUES ($1, $2, $3)
      RETURNING id, ticket_id, nf_chave, valor_desconto, aplicado_em
    `;

    const result = await pool.query(query, [desconto.ticketId, desconto.nfChave, desconto.valorDesconto]);

    const row = result.rows[0];

    return {
      id: row.id,
      ticketId: row.ticket_id,
      nfChave: row.nf_chave,
      valorDesconto: Number(row.valor_desconto),
      aplicadoEm: new Date(row.aplicado_em),
    };
  }

  async buscarPorTicketId(ticketId: string): Promise<TicketDesconto[]> {
    const query = `
      SELECT id, ticket_id, nf_chave, valor_desconto, aplicado_em
      FROM ticket_descontos
      WHERE ticket_id = $1
      ORDER BY aplicado_em DESC
    `;

    const result = await pool.query(query, [ticketId]);

    return result.rows.map((row) => ({
      id: row.id,
      ticketId: row.ticket_id,
      nfChave: row.nf_chave,
      valorDesconto: Number(row.valor_desconto),
      aplicadoEm: new Date(row.aplicado_em),
    }));
  }
}

