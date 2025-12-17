import { Router } from 'express';
import { SerproController } from './SerproController';

const serproRouter = Router();

/**
 * @swagger
 * /integrations/serpro/nfe/{chave}:
 *   get:
 *     summary: Consulta uma NFE no SERPRO
 *     tags: [Integração SERPRO]
 *     parameters:
 *       - in: path
 *         name: chave
 *         schema:
 *           type: string
 *         required: true
 *         description: Chave de acesso da NFE
 *     responses:
 *       200:
 *         description: Dados da NFE encontrados
 *       404:
 *         description: NFE não encontrada
 */
serproRouter.get('/nfe/:chave', (req, res) => {
  void SerproController.consultarNfe(req, res);
});

export { serproRouter };


