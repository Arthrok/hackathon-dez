import { Pool, PoolClient } from 'pg';
import { pool } from '../../../shared/infra/db';
import { UserVehicleRepository } from '../domain/UserVehicleRepository';

export class PgUserVehicleRepository implements UserVehicleRepository {
    private db: Pool | PoolClient;

    constructor(db?: Pool | PoolClient) {
        this.db = db || pool;
    }

    async adicionarVeiculo(userId: string, placa: string, tipo?: string): Promise<void> {
        const query = `
            INSERT INTO usuarios_veiculos (user_id, placa, tipo)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, placa) DO NOTHING
        `;
        await this.db.query(query, [userId, placa, tipo || null]);
    }

    async buscarVeiculosPorUsuario(userId: string): Promise<{ placa: string, tipo: string | null }[]> {
        const query = `SELECT placa, tipo FROM usuarios_veiculos WHERE user_id = $1`;
        const result = await this.db.query(query, [userId]);
        return result.rows;
    }
}
