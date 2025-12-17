import { Request, Response } from 'express';
import { CriarNotaFiscal } from '../application/CriarNotaFiscal';
import { BuscarNotaFiscalPorId } from '../application/BuscarNotaFiscalPorId';
import { PgNotaFiscalRepository } from '../infra/PgNotaFiscalRepository';

const repo = new PgNotaFiscalRepository();
const criarNotaFiscalUseCase = new CriarNotaFiscal(repo);
const buscarNotaFiscalPorIdUseCase = new BuscarNotaFiscalPorId(repo);

export class NotaFiscalController {
  static async criar(req: Request, res: Response): Promise<void> {
    const { numero, emitente, valorTotal } = req.body ?? {};

    if (!numero || typeof numero !== 'string') {
      res.status(400).json({ message: 'Campo "numero" é obrigatório e deve ser string.' });
      return;
    }

    if (!emitente || typeof emitente !== 'string') {
      res.status(400).json({ message: 'Campo "emitente" é obrigatório e deve ser string.' });
      return;
    }

    if (valorTotal === undefined || typeof valorTotal !== 'number') {
      res.status(400).json({ message: 'Campo "valorTotal" é obrigatório e deve ser number.' });
      return;
    }

    if (valorTotal < 0) {
      res.status(400).json({ message: 'Campo "valorTotal" deve ser maior ou igual a 0.' });
      return;
    }

    try {
      const output = await criarNotaFiscalUseCase.executar({
        numero,
        emitente,
        valorTotal,
      });

      res.status(201).json(output);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao criar nota fiscal:', error);
      res.status(500).json({ message: 'Erro ao criar nota fiscal.' });
    }
  }

  static async buscarPorId(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: 'Parâmetro "id" é obrigatório.' });
      return;
    }

    try {
      const nota = await buscarNotaFiscalPorIdUseCase.executar(id);

      if (!nota) {
        res.status(404).json({ message: 'Nota fiscal não encontrada.' });
        return;
      }

      res.json(nota);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao buscar nota fiscal:', error);
      res.status(500).json({ message: 'Erro ao buscar nota fiscal.' });
    }
  }
}


