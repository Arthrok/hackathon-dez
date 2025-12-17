import { NotaFiscal } from '../domain/NotaFiscal';
import { NotaFiscalRepository } from '../domain/NotaFiscalRepository';

interface BuscarNotaFiscalPorIdOutput {
  id: string;
  numero: string;
  emitente: string;
  valorTotal: number;
  criadaEm: Date;
}

export class BuscarNotaFiscalPorId {
  constructor(private readonly repo: NotaFiscalRepository) {}

  async executar(id: string): Promise<BuscarNotaFiscalPorIdOutput | null> {
    const nota: NotaFiscal | null = await this.repo.buscarPorId(id);

    if (!nota) {
      return null;
    }

    return {
      id: nota.id,
      numero: nota.numero,
      emitente: nota.emitente,
      valorTotal: nota.valorTotal,
      criadaEm: nota.criadaEm,
    };
  }
}


