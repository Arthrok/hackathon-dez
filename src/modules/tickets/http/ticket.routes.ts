import { Router } from 'express';
import { TicketTipoController } from './TicketTipoController';
import { TicketController } from './TicketController';
import { TicketDescontoController } from './TicketDescontoController';
import { TicketPagamentoController } from './TicketPagamentoController';

const ticketRouter = Router();

// Tipos de ticket
/**
 * @swagger
 * /ticket-tipos:
 *   get:
 *     summary: Lista os tipos de ticket disponíveis
 *     tags: [Tickets]
 *     responses:
 *       200:
 *         description: Lista de tipos de ticket retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   descricao:
 *                     type: string
 *                     example: "Ingresso Inteira"
 */
ticketRouter.get('/ticket-tipos', (req, res) => {
  void TicketTipoController.listar(req, res);
});

// Tickets
/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Cria um novo ticket
 *     tags: [Tickets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tipoId:
 *                 type: integer
 *                 example: 1
 *               valor:
 *                 type: number
 *                 example: 100.00
 *     responses:
 *       201:
 *         description: Ticket criado com sucesso
 */
ticketRouter.post('/tickets', (req, res) => {
  void TicketController.criar(req, res);
});

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Busca um ticket por ID
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do ticket
 *     responses:
 *       200:
 *         description: Detalhes do ticket
 *       404:
 *         description: Ticket não encontrado
 */

ticketRouter.get('/tickets/:id', (req, res) => {
  void TicketController.buscarPorId(req, res);
});

// Descontos
/**
 * @swagger
 * /tickets/{id}/descontos:
 *   post:
 *     summary: Aplica um desconto a um ticket
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               codigo:
 *                 type: string
 *                 example: "DESC10"
 *               valor:
 *                 type: number
 *                 example: 10.00
 *     responses:
 *       200:
 *         description: Desconto aplicado com sucesso
 */
ticketRouter.post('/tickets/:id/descontos', (req, res) => {
  void TicketDescontoController.aplicar(req, res);
});

/**
 * @swagger
 * /tickets/{id}/descontos:
 *   get:
 *     summary: Lista os descontos de um ticket
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do ticket
 *     responses:
 *       200:
 *         description: Lista de descontos
 */
ticketRouter.get('/tickets/:id/descontos', (req, res) => {
  void TicketDescontoController.listar(req, res);
});

// Pagamentos
/**
 * @swagger
 * /tickets/{id}/pagamento:
 *   get:
 *     summary: Consulta o status de pagamento de um ticket
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do ticket
 *     responses:
 *       200:
 *         description: Status do pagamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "PAGO"
 */
ticketRouter.get('/tickets/:id/pagamento', (req, res) => {
  void TicketPagamentoController.consultar(req, res);
});

/**
 * @swagger
 * /tickets/{id}/pagamento:
 *   post:
 *     summary: Processa o pagamento de um ticket
 *     tags: [Tickets]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metodo:
 *                 type: string
 *                 example: "CREDITO"
 *     responses:
 *       200:
 *         description: Pagamento processado com sucesso
 */
ticketRouter.post('/tickets/:id/pagamento', (req, res) => {
  void TicketPagamentoController.processar(req, res);
});

export { ticketRouter };

