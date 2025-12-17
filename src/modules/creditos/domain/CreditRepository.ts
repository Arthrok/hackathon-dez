import { CreditMovement } from './CreditMovement';

export interface CreditRepository {
    criar(movimento: CreditMovement): Promise<void>;
    listarPorUsuario(userId: string): Promise<CreditMovement[]>;
}
