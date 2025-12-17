import { Request, Response } from 'express';
import { ListarTicketTipos } from '../application/ListarTicketTipos';
import { PgTicketTipoRepository } from '../infra/PgTicketTipoRepository';

const repo = new PgTicketTipoRepository();
const useCase = new ListarTicketTipos(repo);

export class TicketTipoController {
  static async listar(_req: Request, res: Response): Promise<void> {
    try {
      const output = await useCase.executar();
      res.json(output);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao listar tipos de ticket:', error);
      res.status(500).json({ message: 'Erro ao listar tipos de ticket.' });
    }
  }
}

