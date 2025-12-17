import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/infra/http/middleware/ensureAuthenticated';
import { PgCreditRepository } from './infra/PgCreditRepository';
import { PgUserRepository } from '../users/infra/PgUserRepository';
import { CreditUseCase } from './CreditUseCase';
import { CreditController } from './CreditController';

const creditRouter = Router();
const creditRepo = new PgCreditRepository();
const userRepo = new PgUserRepository();
const creditUseCase = new CreditUseCase(creditRepo, userRepo);
const creditController = new CreditController(creditUseCase);

creditRouter.use(ensureAuthenticated);
/**
 * @swagger
 * tags:
 *   name: Credits
 *   description: Gerenciamento de créditos
 */

/**
 * @swagger
 * /me/creditos:
 *   post:
 *     summary: Adiciona crédito manual (MVP)
 *     tags: [Credits]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               valor:
 *                 type: number
 *               descricao:
 *                 type: string
 *     responses:
 *       200:
 *         description: Crédito adicionado
 */
creditRouter.post('/creditos', (req, res) => creditController.adicionarManual(req, res));

/**
 * @swagger
 * /me/creditos:
 *   get:
 *     summary: Consulta saldo e extrato de créditos
 *     tags: [Credits]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saldo e extrato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 saldo:
 *                   type: number
 *                 movimentos:
 *                   type: array
 */
creditRouter.get('/creditos', (req, res) => creditController.verExtrato(req, res));

export { creditRouter };
