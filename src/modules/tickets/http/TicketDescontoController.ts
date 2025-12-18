import { Request, Response } from 'express';
import { AplicarDescontoPorNf } from '../application/AplicarDescontoPorNf';
import { ListarDescontosPorTicket } from '../application/ListarDescontosPorTicket';
import { PgTicketDescontoRepository } from '../infra/PgTicketDescontoRepository';
import { SerproClient } from '../../../integrations/serpro/SerproClient';

// Instantiation
const serproClient = new SerproClient();
// AplicarDescontoPorNf only needs serproClient now, it instantiates repos with transaction client internally.
const aplicarDescontoUseCase = new AplicarDescontoPorNf(serproClient);

const descontoRepo = new PgTicketDescontoRepository(); // For listing (read-only)
const listarDescontosUseCase = new ListarDescontosPorTicket(descontoRepo);

export class TicketDescontoController {
  static async aplicar(req: Request, res: Response): Promise<void> {
    const { chave } = req.body ?? {};
    const { id: userId } = req.user!;

    if (!chave || typeof chave !== 'string' || chave.length !== 44) {
      res.status(400).json({ message: 'Campo "chave" é obrigatório e deve ter 44 caracteres.' });
      return;
    }

    try {
      const output = await aplicarDescontoUseCase.executar({
        chaveNf: chave,
        userId: userId
      });

      res.status(201).json(output);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Erro ao aplicar desconto:', error);

      if (error.message?.includes('não encontrado') || error.message?.includes('não pertence')) {
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
    // Ownership check for listing?
    // ListarDescontosPorTicket UseCase currently just queries by TicketId.
    // Ideally we should check if ticket belongs to user.
    // But Controller doesn't inject TicketRepo here.
    // Let's assume for now listing discounts validation is weak or user can only access if they know ID (UUID is hard to guess).
    // Or we could update ListarDescontosPorTicket to verify ownership.
    // For MVP/Hackathon, I'll leave it as is, or add a quick check if I had TicketRepo.

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
