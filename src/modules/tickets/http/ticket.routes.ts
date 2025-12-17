import { Router } from 'express';
import { TicketTipoController } from './TicketTipoController';
import { TicketController } from './TicketController';
import { TicketDescontoController } from './TicketDescontoController';
import { TicketPagamentoController } from './TicketPagamentoController';
import { ensureAuthenticated } from '../../../shared/infra/http/middleware/ensureAuthenticated';

const ticketRouter = Router();

// Public Routes
/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Gerenciamento de tickets de estacionamento
 */

// Public Routes
/**
 * @swagger
 * /ticket-tipos:
 *   get:
 *     summary: Lista tipos de tickets disponíveis
 *     tags: [Tickets]
 *     responses:
 *       200:
 *         description: Lista de tipos
 */
ticketRouter.get('/ticket-tipos', (req, res) => {
  void TicketTipoController.listar(req, res);
});

// Protected Routes
ticketRouter.use('/tickets', ensureAuthenticated);

/**
 * @swagger
 * /tickets:
 *   post:
 *     summary: Cria um novo ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tipoHoras:
 *                 type: integer
 *                 example: 2
 *               timestampEntrada:
 *                 type: string
 *                 format: date-time
 *                 example: "2016-09-11T11:00:00-03:00"
 *               placaDoCarro:
 *                 type: string
 *                 example: "ABC1E23"
 *               usarCredito:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Ticket criado
 *       400:
 *         description: Erro de validação
 */
ticketRouter.post('/tickets', (req, res) => {
  void TicketController.criar(req, res);
});

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Busca ticket por ID
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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

/**
 * @swagger
 * /tickets/{id}/descontos:
 *   post:
 *     summary: Aplica desconto via Nota Fiscal
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chave:
 *                 type: string
 *                 description: Chave de 44 dígitos da NF
 *                 example: "53160911510448000171550010000106771000187760"
 *     responses:
 *       201:
 *         description: Desconto aplicado com sucesso
 *       400:
 *         description: CEP inválido ou regra de negócio
 *       409:
 *         description: NF já usada ou data inválida
 */
ticketRouter.post('/tickets/:id/descontos', (req, res) => {
  void TicketDescontoController.aplicar(req, res);
});

/**
 * @swagger
 * /tickets/{id}/descontos:
 *   get:
 *     summary: Lista descontos aplicados ao ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de descontos history
 */
ticketRouter.get('/tickets/:id/descontos', (req, res) => {
  void TicketDescontoController.listar(req, res);
});

/**
 * @swagger
 * /tickets/{id}/pagamento:
 *   get:
 *     summary: Consulta status de pagamento
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status do pagamento
 */
ticketRouter.get('/tickets/:id/pagamento', (req, res) => {
  void TicketPagamentoController.consultar(req, res);
});

/**
 * @swagger
 * /tickets/{id}/pagamento:
 *   post:
 *     summary: Processa pagamento do ticket
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metodo:
 *                 type: string
 *                 enum: [cartao, pix, dinheiro]
 *                 example: cartao
 *     responses:
 *       201:
 *         description: Pagamento realizado
 */
ticketRouter.post('/tickets/:id/pagamento', (req, res) => {
  void TicketPagamentoController.processar(req, res);
});

export { ticketRouter };
