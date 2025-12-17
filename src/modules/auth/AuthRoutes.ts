import { Router } from 'express';
import { AuthController } from './AuthController';
import { AuthUseCase } from './AuthUseCase';
import { PgUserVehicleRepository } from '../users/infra/PgUserVehicleRepository';
import { PgUserRepository } from '../users/infra/PgUserRepository';

const authRouter = Router();
const userRepository = new PgUserRepository();
const userVehicleRepository = new PgUserVehicleRepository();
const authUseCase = new AuthUseCase(userRepository, userVehicleRepository);
const authController = new AuthController(authUseCase);

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticação de usuários
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registra um novo usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *               celular:
 *                 type: string
 *               cpf:
 *                 type: string
 *               placaDoCarro:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Dados inválidos
 */
authRouter.post('/register', (req, res) => authController.register(req, res));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realiza login de usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 token:
 *                   type: string
 *       401:
 *         description: Credenciais inválidas
 */
authRouter.post('/login', (req, res) => authController.login(req, res));

export { authRouter };
