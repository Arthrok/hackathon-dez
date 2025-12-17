import { Router } from 'express';
import { NotaFiscalController } from './NotaFiscalController';

const notaFiscalRouter = Router();

notaFiscalRouter.post('/', (req, res) => {
  void NotaFiscalController.criar(req, res);
});

notaFiscalRouter.get('/:id', (req, res) => {
  void NotaFiscalController.buscarPorId(req, res);
});

export { notaFiscalRouter };


