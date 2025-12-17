import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/infra/http/middleware/ensureAuthenticated';
import { PgUserRepository } from './infra/PgUserRepository';
import { PgTicketRepository } from '../tickets/infra/PgTicketRepository'; // Will be updated
import { Request, Response } from 'express';

const userRouter = Router();
const userRepo = new PgUserRepository();
const ticketRepo = new PgTicketRepository();

userRouter.use(ensureAuthenticated);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gerenciamento de usuários
 */

/**
 * @swagger
 * /me:
 *   get:
 *     summary: Retorna dados do usuário autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário
 *       401:
 *         description: Não autorizado
 */
userRouter.get('/me', async (req: Request, res: Response) => {
    const user = await userRepo.buscarPorId(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Omit password
    const { senhaHash, ...userData } = user as any;
    res.json(userData);
});

/**
 * @swagger
 * /me/tickets:
 *   get:
 *     summary: Lista tickets do usuário autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de tickets
 */
userRouter.get('/me/tickets', async (req: Request, res: Response) => {
    const { status, limit, offset } = req.query;
    // This method needs to be added to TicketRepository
    const tickets = await ticketRepo.listarPorUsuario(req.user!.id, {
        status: status as string,
        limit: limit ? Number(limit) : 20,
        offset: offset ? Number(offset) : 0
    });
    res.json(tickets);
});

/**
 * @swagger
 * /me/tickets/ativo:
 *   get:
 *     summary: Busca ticket ativo do usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket ativo ou null
 */
userRouter.get('/me/tickets/ativo', async (req: Request, res: Response) => {
    const ticket = await ticketRepo.buscarAtivoPorUsuario(req.user!.id);
    res.json(ticket || null);
});

export { userRouter };
