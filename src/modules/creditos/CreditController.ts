import { Request, Response } from 'express';
import { CreditUseCase } from './CreditUseCase';

export class CreditController {
    constructor(private creditUseCase: CreditUseCase) { }

    async adicionarManual(req: Request, res: Response) {
        const { id: userId } = req.user!;
        const { valor, descricao } = req.body;

        try {
            const result = await this.creditUseCase.adicionarCreditoManual(userId, Number(valor), descricao || 'Crédito Manual');
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    async verExtrato(req: Request, res: Response) {
        const { id: userId } = req.user!;

        try {
            const result = await this.creditUseCase.obterSaldoExtrato(userId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }
}
