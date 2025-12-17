import { Request, Response } from 'express';
import { AuthUseCase } from './AuthUseCase';

export class AuthController {
    constructor(private authUseCase: AuthUseCase) { }

    async register(req: Request, res: Response): Promise<void> {
        const { nome, email, celular, cpf, placaDoCarro, senha } = req.body;

        try {
            await this.authUseCase.register({ nome, email, celular, cpf, placaDoCarro, senha });
            res.status(201).send();
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        const { email, senha } = req.body;

        try {
            const result = await this.authUseCase.login({ email, senha });
            res.json(result);
        } catch (err: any) {
            res.status(401).json({ message: err.message });
        }
    }
}
