import { Request, Response } from 'express';
import { AplicarDescontoPorNf } from '../application/AplicarDescontoPorNf';
import { ListarDescontosPorTicket } from '../application/ListarDescontosPorTicket';
import { PgTicketRepository } from '../infra/PgTicketRepository';
import { PgNotaFiscalRepository } from '../infra/PgNotaFiscalRepository';
import { PgCepScsRepository } from '../infra/PgCepScsRepository';
import { PgTicketDescontoRepository } from '../infra/PgTicketDescontoRepository';
import { SerproClient } from '../../../integrations/serpro/SerproClient';

const ticketRepo = new PgTicketRepository();
const notaFiscalRepo = new PgNotaFiscalRepository();
const cepScsRepo = new PgCepScsRepository();
const descontoRepo = new PgTicketDescontoRepository();
const serproClient = new SerproClient();

const aplicarDescontoUseCase = new AplicarDescontoPorNf(
  ticketRepo,
  notaFiscalRepo,
  cepScsRepo,
  descontoRepo,
  serproClient
);
const listarDescontosUseCase = new ListarDescontosPorTicket(descontoRepo);

export class TicketDescontoController {
  static async aplicar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { chave } = req.body ?? {};

    if (!id) {
      res.status(400).json({ message: 'Parâmetro "id" é obrigatório.' });
      return;
    }

    if (!chave || typeof chave !== 'string' || chave.length !== 44) {
      res.status(400).json({ message: 'Campo "chave" é obrigatório e deve ter 44 caracteres.' });
      return;
    }

    try {
      const output = await aplicarDescontoUseCase.executar({
        ticketId: id,
        chaveNf: chave,
      });

      res.status(201).json(output);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Erro ao aplicar desconto:', error);

      if (error.message?.includes('não encontrado')) {
        res.status(404).json({ message: error.message });
        return;
      }

      if (
        error.message?.includes('deve estar ABERTO') ||
        error.message?.includes('fora do intervalo') ||
        error.message?.includes('já foi utilizada')
      ) {
        res.status(409).json({ message: error.message });
        return;
      }

      if (error.message?.includes('não está ativo') || error.message?.includes('CEP inválido')) {
        res.status(400).json({ message: error.message });
        return;
      }

      if (error.status === 502) {
        res.status(502).json({ message: 'Erro ao consultar SERPRO. Tente novamente mais tarde.' });
        return;
      }

      res.status(500).json({ message: error.message || 'Erro ao aplicar desconto.' });
    }
  }

  static async listar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: 'Parâmetro "id" é obrigatório.' });
      return;
    }

    try {
      const descontos = await listarDescontosUseCase.executar(id);
      res.json(descontos);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao listar descontos:', error);
      res.status(500).json({ message: 'Erro ao listar descontos.' });
    }
  }
}

