import { Router } from 'express';
import { NotaFiscalController } from './NotaFiscalController';

const notaFiscalRouter = Router();

/**
 * @swagger
 * /nota-fiscal:
 *   post:
 *     summary: Cria uma nova nota fiscal
 *     tags: [Nota Fiscal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               valor:
 *                 type: number
 *                 example: 150.50
 *               clienteId:
 *                 type: string
 *                 example: "12345"
 *     responses:
 *       200:
 *         description: Nota fiscal criada com sucesso
 */
notaFiscalRouter.post('/', (req, res) => {
  void NotaFiscalController.criar(req, res);
});

/**
 * @swagger
 * /nota-fiscal/{id}:
 *   get:
 *     summary: Busca uma nota fiscal por ID
 *     tags: [Nota Fiscal]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID da nota fiscal
 *     responses:
 *       200:
 *         description: Detalhes da nota fiscal
 *       404:
 *         description: Nota fiscal não encontrada
 */
notaFiscalRouter.get('/:id', (req, res) => {
  void NotaFiscalController.buscarPorId(req, res);
});

export { notaFiscalRouter };


