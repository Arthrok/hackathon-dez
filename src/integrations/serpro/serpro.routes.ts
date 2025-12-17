import { Router } from 'express';
import { SerproController } from './SerproController';

const serproRouter = Router();

serproRouter.get('/nfe/:chave', (req, res) => {
  void SerproController.consultarNfe(req, res);
});

export { serproRouter };


