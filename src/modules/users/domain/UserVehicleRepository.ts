export interface UserVehicleRepository {
    adicionarVeiculo(userId: string, placa: string, tipo?: string): Promise<void>;
    buscarVeiculosPorUsuario(userId: string): Promise<{ placa: string, tipo: string | null }[]>;
}
