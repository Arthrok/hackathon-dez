import { Pool, PoolClient } from 'pg';
import { pool } from '../../../shared/infra/db';
import { CepScsRepository } from '../domain/CepScsRepository';

export class PgCepScsRepository implements CepScsRepository {
  private db: Pool | PoolClient;

  constructor(db?: Pool | PoolClient) {
    this.db = db || pool;
  }

  async verificarSeAtivo(cep: string): Promise<boolean> {
    const query = `SELECT ativo FROM ceps_scs WHERE cep = $1`;
    const result = await this.db.query(query, [cep]);

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].ativo;
  }
}
