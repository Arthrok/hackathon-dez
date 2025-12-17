import { randomUUID } from 'crypto';
import { NotaFiscal } from '../domain/NotaFiscal';
import { NotaFiscalRepository } from '../domain/NotaFiscalRepository';

interface CriarNotaFiscalInput {
  numero: string;
  emitente: string;
  valorTotal: number;
}

interface CriarNotaFiscalOutput {
  id: string;
  numero: string;
  emitente: string;
  valorTotal: number;
  criadaEm: Date;
}

export class CriarNotaFiscal {
  constructor(private readonly repo: NotaFiscalRepository) {}

  async executar(input: CriarNotaFiscalInput): Promise<CriarNotaFiscalOutput> {
    const nota = NotaFiscal.create({
      id: randomUUID(),
      numero: input.numero,
      emitente: input.emitente,
      valorTotal: input.valorTotal,
    });

    await this.repo.criar(nota);

    return {
      id: nota.id,
      numero: nota.numero,
      emitente: nota.emitente,
      valorTotal: nota.valorTotal,
      criadaEm: nota.criadaEm,
    };
  }
}


