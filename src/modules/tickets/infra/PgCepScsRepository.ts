import { pool } from '../../../db/pg';
import { CepScsRepository } from '../domain/CepScsRepository';

export class PgCepScsRepository implements CepScsRepository {
  async verificarSeAtivo(cep: string): Promise<boolean> {
    const query = 'SELECT ativo FROM ceps_scs WHERE cep = $1 AND ativo = true';

    const result = await pool.query(query, [cep]);

    return result.rows.length > 0;
  }
}

