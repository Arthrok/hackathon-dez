import { Request, Response } from 'express';
import { SerproClient, SerproError } from './SerproClient';

const client = new SerproClient();

export class SerproController {
  static async consultarNfe(req: Request, res: Response): Promise<void> {
    const { chave } = req.params;

    if (!chave) {
      res.status(400).json({ message: 'Parâmetro "chave" é obrigatório.' });
      return;
    }

    try {
      const data = await client.consultarNfe(chave);
      res.json(data);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Erro na integração SERPRO:', error);

      const err = error as SerproError;

      if (err.status && err.status !== 502) {
        res.status(err.status).json({
          message: 'Erro ao consultar NFe no SERPRO.',
          serproResponse: err.responseBody ?? null,
        });
        return;
      }

      res.status(502).json({
        message: err.message || 'Erro de integração com o SERPRO.',
      });
    }
  }
}


