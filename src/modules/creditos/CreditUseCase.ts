import { v4 as uuidV4 } from 'uuid';
import { CreditRepository } from './domain/CreditRepository';
import { UserRepository } from '../users/domain/UserRepository';
import { CreditMovement } from './domain/CreditMovement';

export class CreditUseCase {
    constructor(
        private creditRepo: CreditRepository,
        private userRepo: UserRepository
    ) { }

    async adicionarCreditoManual(userId: string, valor: number, descricao: string) {
        if (valor <= 0) {
            throw new Error('Valor deve ser positivo');
        }

        const valorArredondado = Math.round(valor * 100) / 100;

        // Transação manual seria ideal aqui, mas sem um TransactionManager abstraído, faremos sequencial.
        // O ideal é usar o connection pool para transação.
        // Como é MVP/Hackathon e não tenho interface de Tx pronta no Repository padrão, vou fazer sequencial e Update atômico no saldo.

        const user = await this.userRepo.buscarPorId(userId);
        if (!user) throw new Error('Usuario não encontrado');

        const novoSaldo = Number(user.creditoSaldo) + valorArredondado;

        // Atualiza saldo
        await this.userRepo.atualizarSaldo(userId, novoSaldo);

        // Registra movimento
        const movimento = CreditMovement.criar({
            id: uuidV4(),
            userId,
            tipo: 'CREDITO_MANUAL',
            valor: valorArredondado,
            direcao: 'ENTRADA',
            descricao,
            criadoEm: new Date()
        });

        await this.creditRepo.criar(movimento);

        return { novoSaldo };
    }

    async obterSaldoExtrato(userId: string) {
        const user = await this.userRepo.buscarPorId(userId);
        if (!user) throw new Error('Usuario não encontrado');

        const movimentos = await this.creditRepo.listarPorUsuario(userId);

        return {
            saldo: Number(user.creditoSaldo),
            movimentos
        };
    }
}
