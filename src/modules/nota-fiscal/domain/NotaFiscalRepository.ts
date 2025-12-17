import { NotaFiscal } from './NotaFiscal';

export interface NotaFiscalRepository {
  criar(nota: NotaFiscal): Promise<void>;
  buscarPorId(id: string): Promise<NotaFiscal | null>;
}


