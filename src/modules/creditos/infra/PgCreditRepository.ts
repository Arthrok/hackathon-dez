import { Pool, PoolClient } from 'pg';
import { pool } from '../../../shared/infra/db';
import { CreditMovement } from '../domain/CreditMovement';
import { CreditRepository } from '../domain/CreditRepository';

export class PgCreditRepository implements CreditRepository {
    private db: Pool | PoolClient;

    constructor(db?: Pool | PoolClient) {
        this.db = db || pool;
    }

    async criar(movimento: CreditMovement): Promise<void> {
        const query = `
      INSERT INTO creditos_movimentos (id, user_id, tipo, valor, direcao, referencia_ticket_id, referencia_nf_chave, descricao, criado_em)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
        const values = [
            movimento.id,
            movimento.userId,
            movimento.tipo,
            movimento.valor,
            movimento.direcao,
            movimento.referenciaTicketId,
            movimento.referenciaNfChave,
            movimento.descricao,
            movimento.criadoEm.toISOString()
        ];
        await this.db.query(query, values);
    }

    async listarPorUsuario(userId: string): Promise<CreditMovement[]> {
        const query = `
      SELECT * FROM creditos_movimentos
      WHERE user_id = $1
      ORDER BY criado_em DESC
    `;
        const result = await this.db.query(query, [userId]);

        return result.rows.map(row => CreditMovement.criar({
            id: row.id,
            userId: row.user_id,
            tipo: row.tipo,
            valor: Number(row.valor),
            direcao: row.direcao,
            referenciaTicketId: row.referencia_ticket_id,
            referenciaNfChave: row.referencia_nf_chave,
            descricao: row.descricao,
            criadoEm: new Date(row.criado_em)
        }));
    }
}
