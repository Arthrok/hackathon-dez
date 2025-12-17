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
 *               tipoHoras:
 *                 type: integer
 *                 example: 2
 *               timestampEntrada:
 *                 type: string
 *                 example: "2016-09-01T00:00:00-03:00"
 *               placaDoCarro:
 *                 type: string
 *                 example: "ABC1E23"
 *     responses:
 *       201:
 *         description: Ticket criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 id: "85205d19-cd52-4f8c-bc21-2d0b19677881"
 *                 status: "ABERTO"
 *                 valorOriginal: 11.5
 *                 valorAtual: 11.5
 *                 timestampEntrada: "2016-09-01T03:00:00.000Z"
 *                 timestampSaida: "2016-09-01T05:00:00.000Z"
 *                 placaDoCarro: "ABC1E23"
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 id: "85205d19-cd52-4f8c-bc21-2d0b19677881"
 *                 status: "ABERTO"
 *                 valorOriginal: 11.5
 *                 valorAtual: 0
 *                 timestampEntrada: "2016-09-01T03:00:00.000Z"
 *                 timestampSaida: "2016-09-01T05:00:00.000Z"
 *                 placaDoCarro: "ABC1E23"
 *                 criadoEm: "2025-12-17T19:40:23.378Z"
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
 *               chave:
 *                 type: string
 *                 example: "53160911510448000171550010000106771000187760"
 *     responses:
 *       200:
 *         description: Desconto aplicado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 ticketId: "85205d19-cd52-4f8c-bc21-2d0b19677881"
 *                 nfChave: "53160911510448000171550010000106771000187760"
 *                 valorNf: 16537.92
 *                 descontoAplicado: 1653.79
 *                 valorTicketAntes: 11.5
 *                 valorTicketDepois: 0
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
 *       - in: header
 *         name: idempotency-key
 *         schema:
 *           type: string
 *         required: false
 *         description: Chave de idempotência
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               metodo:
 *                 type: string
 *                 enum: [pix, cartao, dinheiro]
 *                 example: "cartao"
 *     responses:
 *       201:
 *         description: Pagamento processado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 ticketId: "85205d19-cd52-4f8c-bc21-2d0b19677881"
 *                 status: "PAGO"
 *                 valorPago: 11.5
 *                 metodo: "cartao"
 *                 dataPagamento: "2025-12-17T19:40:23.378Z"
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Ticket não encontrado
 *       409:
 *         description: Ticket não está aberto
 */
ticketRouter.post('/tickets/:id/pagamento', (req, res) => {
  void TicketPagamentoController.processar(req, res);
});

export { ticketRouter };

