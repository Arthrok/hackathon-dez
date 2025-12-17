import express, { Application, Request, Response, NextFunction } from 'express';
import './config/env'; // carrega variáveis de ambiente
import { json } from 'express';
import { notaFiscalRouter } from './modules/nota-fiscal/http/notaFiscal.routes';
import { serproRouter } from './integrations/serpro/serpro.routes';

const app: Application = express();

app.use(json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/nota-fiscal', notaFiscalRouter);
app.use('/integrations/serpro', serproRouter);

// Middleware simples de erro
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    message: 'Erro interno do servidor.',
  });
});

export { app };


