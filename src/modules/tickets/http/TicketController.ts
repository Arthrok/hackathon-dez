import { Request, Response } from 'express';
import { CriarTicket } from '../application/CriarTicket';
import { BuscarTicketPorId } from '../application/BuscarTicketPorId';
import { PgTicketRepository } from '../infra/PgTicketRepository';
import { PgTicketTipoRepository } from '../infra/PgTicketTipoRepository';

const ticketRepo = new PgTicketRepository();
const tipoRepo = new PgTicketTipoRepository();
const criarTicketUseCase = new CriarTicket(ticketRepo, tipoRepo);
const buscarTicketUseCase = new BuscarTicketPorId(ticketRepo);

export class TicketController {
  static async criar(req: Request, res: Response): Promise<void> {
    const { tipoHoras, timestampEntrada, placaDoCarro } = req.body ?? {};

    if (!tipoHoras || typeof tipoHoras !== 'number' || ![1, 2, 3, 4].includes(tipoHoras)) {
      res.status(400).json({ message: 'Campo "tipoHoras" é obrigatório e deve ser 1, 2, 3 ou 4.' });
      return;
    }

    if (!timestampEntrada) {
      res.status(400).json({ message: 'Campo "timestampEntrada" é obrigatório (ISO 8601).' });
      return;
    }

    let timestampEntradaDate: Date;
    try {
      timestampEntradaDate = new Date(timestampEntrada);
      if (isNaN(timestampEntradaDate.getTime())) {
        throw new Error('Data inválida');
      }
    } catch {
      res.status(400).json({ message: 'Campo "timestampEntrada" deve ser uma data válida (ISO 8601).' });
      return;
    }

    if (!placaDoCarro || typeof placaDoCarro !== 'string' || placaDoCarro.trim().length === 0) {
      res.status(400).json({ message: 'Campo "placaDoCarro" é obrigatório e deve ser string não vazia.' });
      return;
    }

    try {
      const output = await criarTicketUseCase.executar({
        tipoHoras,
        timestampEntrada: timestampEntradaDate,
        placaDoCarro: placaDoCarro.trim(),
      });

      res.status(201).json(output);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Erro ao criar ticket:', error);
      res.status(500).json({ message: error.message || 'Erro ao criar ticket.' });
    }
  }

  static async buscarPorId(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: 'Parâmetro "id" é obrigatório.' });
      return;
    }

    try {
      const ticket = await buscarTicketUseCase.executar(id);

      if (!ticket) {
        res.status(404).json({ message: 'Ticket não encontrado.' });
        return;
      }

      res.json(ticket);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao buscar ticket:', error);
      res.status(500).json({ message: 'Erro ao buscar ticket.' });
    }
  }
}

