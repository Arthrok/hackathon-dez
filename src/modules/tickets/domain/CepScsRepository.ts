export interface CepScsRepository {
  verificarSeAtivo(cep: string): Promise<boolean>;
}

