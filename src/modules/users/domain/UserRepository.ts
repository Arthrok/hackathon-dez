import { User } from './User';

export interface UserRepository {
    criar(user: User): Promise<void>;
    buscarPorEmail(email: string): Promise<User | null>;
    buscarPorId(id: string): Promise<User | null>;
    /* busca com lock para transações de crédito */
    buscarPorIdComLock(id: string): Promise<User | null>;
    atualizarSaldo(userId: string, novoSaldo: number): Promise<void>;
}
