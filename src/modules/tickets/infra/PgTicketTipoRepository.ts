import { Pool, PoolClient } from 'pg';
import { pool } from '../../../shared/infra/db';
import { TicketTipo } from '../domain/TicketTipo';
import { TicketTipoRepository } from '../domain/TicketTipoRepository';

export class PgTicketTipoRepository implements TicketTipoRepository {
  private db: Pool | PoolClient;

  constructor(db?: Pool | PoolClient) {
    this.db = db || pool;
  }

  async buscarPorHoras(horas: number): Promise<TicketTipo | null> {
    const query = `SELECT * FROM ticket_tipos WHERE horas = $1`;
    const result = await this.db.query(query, [horas]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    // Use loose cast or create properly. TicketTipo has validation in create.
    // Database data should be valid.
    /*
      TicketTipo.create({
        id: row.id,
        horas: row.horas,
        precoPorHora: Number(row.preco_por_hora)
      })
      But create generates new instance logic? No, just validation.
      However, we need ID from DB. TicketTipo constructor sets ID.
      TicketTipoProps has id.
    */
    // We need to access private constructor or use a method that allows setting ID. 'create' takes props including ID?
    // Let's check TicketTipo.ts again.
    // static create(props: TicketTipoProps): TicketTipo. Props has ID.
    return TicketTipo.create({
      id: row.id,
      horas: row.horas,
      precoPorHora: Number(row.preco_por_hora)
    });
  }

  async buscarTodos(): Promise<TicketTipo[]> {
    const query = `SELECT * FROM ticket_tipos ORDER BY horas ASC`;
    const result = await this.db.query(query);

    return result.rows.map(row => TicketTipo.create({
      id: row.id,
      horas: row.horas,
      precoPorHora: Number(row.preco_por_hora)
    }));
  }
}
