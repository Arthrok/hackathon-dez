import { Request, Response } from 'express';
import { ConsultarPagamento } from '../application/ConsultarPagamento';
import { ProcessarPagamento } from '../application/ProcessarPagamento';
import { PgTicketRepository } from '../infra/PgTicketRepository';
import { PgTicketPagamentoRepository } from '../infra/PgTicketPagamentoRepository';

const ticketRepo = new PgTicketRepository();
const pagamentoRepo = new PgTicketPagamentoRepository();

const consultarPagamentoUseCase = new ConsultarPagamento(ticketRepo);
const processarPagamentoUseCase = new ProcessarPagamento(ticketRepo, pagamentoRepo);

export class TicketPagamentoController {
  static async consultar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: 'Parâmetro "id" é obrigatório.' });
      return;
    }

    try {
      const pagamento = await consultarPagamentoUseCase.executar(id);

      if (!pagamento) {
        res.status(404).json({ message: 'Ticket não encontrado.' });
        return;
      }

      res.json(pagamento);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao consultar pagamento:', error);
      res.status(500).json({ message: 'Erro ao consultar pagamento.' });
    }
  }

  static async processar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { metodo } = req.body ?? {};
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    if (!id) {
      res.status(400).json({ message: 'Parâmetro "id" é obrigatório.' });
      return;
    }

    if (metodo && !['pix', 'cartao', 'dinheiro'].includes(metodo)) {
      res.status(400).json({ message: 'Campo "metodo" deve ser "pix", "cartao" ou "dinheiro".' });
      return;
    }

    try {
      const output = await processarPagamentoUseCase.executar({
        ticketId: id,
        metodo: metodo ?? undefined,
        idempotencyKey: idempotencyKey ?? undefined,
      });

      res.status(201).json(output);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Erro ao processar pagamento:', error);

      if (error.message?.includes('não encontrado')) {
        res.status(404).json({ message: error.message });
        return;
      }

      if (error.message?.includes('deve estar ABERTO')) {
        res.status(409).json({ message: error.message });
        return;
      }

      res.status(500).json({ message: error.message || 'Erro ao processar pagamento.' });
    }
  }
}

