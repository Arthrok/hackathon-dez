import { Pool, PoolClient } from 'pg';
import { pool } from '../../../shared/infra/db';
import { TicketDescontoRepository } from '../domain/TicketDescontoRepository';

export class PgTicketDescontoRepository implements TicketDescontoRepository {
  private db: Pool | PoolClient;

  constructor(db?: Pool | PoolClient) {
    this.db = db || pool;
  }

  async criar(dados: {
    ticketId: string;
    nfChave: string;
    valorDesconto: number;
    descontoCalculado: number;
    descontoAplicadoNoTicket: number;
    creditoGerado: number;
  }): Promise<void> {
    const query = `
      INSERT INTO ticket_descontos (ticket_id, nf_chave, valor_desconto, desconto_calculado, desconto_aplicado_no_ticket, credito_gerado)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const values = [
      dados.ticketId,
      dados.nfChave,
      dados.valorDesconto, // Deprecated/Legacy field, keeping for compatibility or using applied amount
      dados.descontoCalculado,
      dados.descontoAplicadoNoTicket,
      dados.creditoGerado
    ];

    await this.db.query(query, values);
  }

  async listarPorTicket(ticketId: string): Promise<any[]> {
    const query = `
      SELECT * FROM ticket_descontos
      WHERE ticket_id = $1
      ORDER BY aplicado_em DESC
    `;
    const result = await this.db.query(query, [ticketId]);
    // Return rows directly or map to domain/DTO. For listing, DTO is fine.
    return result.rows.map(row => ({
      id: row.id,
      ticketId: row.ticket_id,
      nfChave: row.nf_chave,
      valorDesconto: Number(row.valor_desconto),
      // include new columns
      descontoCalculado: Number(row.desconto_calculado ?? 0),
      descontoAplicadoNoTicket: Number(row.desconto_aplicado_no_ticket ?? 0),
      creditoGerado: Number(row.credito_gerado ?? 0),
      aplicadoEm: new Date(row.aplicado_em)
    }));
  }
}
