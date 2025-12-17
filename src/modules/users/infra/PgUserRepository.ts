import { Pool, PoolClient } from 'pg';
import { pool } from '../../../shared/infra/db';
import { User } from '../domain/User';
import { UserRepository } from '../domain/UserRepository';

export class PgUserRepository implements UserRepository {
    private db: Pool | PoolClient;

    constructor(db?: Pool | PoolClient) {
        this.db = db || pool;
    }

    async criar(user: User): Promise<void> {
        const query = `
      INSERT INTO usuarios(id, nome, email, celular, cpf, senha_hash, credito_saldo, criado_em)
        VALUES($1, $2, $3, $4, $5, $6, $7, $8)
            `;
        const values = [
            user.id,
            user.nome,
            user.email,
            user.celular,
            user.cpf,
            user.senhaHash,
            user.creditoSaldo,
            user.criadoEm.toISOString()
        ];
        await this.db.query(query, values);
    }

    async buscarPorEmail(email: string): Promise<User | null> {
        const result = await this.db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) return null;
        return this.mapToUser(result.rows[0]);
    }

    async buscarPorId(id: string): Promise<User | null> {
        const result = await this.db.query('SELECT * FROM usuarios WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;
        return this.mapToUser(result.rows[0]);
    }

    async buscarPorIdComLock(id: string): Promise<User | null> {
        const result = await this.db.query('SELECT * FROM usuarios WHERE id = $1 FOR UPDATE', [id]);
        if (result.rows.length === 0) return null;
        return this.mapToUser(result.rows[0]);
    }

    async atualizarSaldo(userId: string, novoSaldo: number): Promise<void> {
        await this.db.query('UPDATE usuarios SET credito_saldo = $1 WHERE id = $2', [novoSaldo, userId]);
    }

    private mapToUser(row: any): User {
        return User.criar({
            id: row.id,
            nome: row.nome,
            email: row.email,
            celular: row.celular,
            cpf: row.cpf,
            senhaHash: row.senha_hash,
            creditoSaldo: Number(row.credito_saldo),
            criadoEm: new Date(row.criado_em),
        });
    }
}
