import { compare, hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { v4 as uuidV4 } from 'uuid';
import { User } from '../users/domain/User';
import { UserRepository } from '../users/domain/UserRepository';
import { UserVehicleRepository } from '../users/domain/UserVehicleRepository';

interface IRegisterRequest {
    nome: string;
    email: string;
    celular: string;
    cpf: string;
    placaDoCarro?: string;
    senha: string;
}

interface ILoginRequest {
    email: string;
    senha: string;
}

export class AuthUseCase {
    constructor(
        private userRepository: UserRepository,
        private userVehicleRepository: UserVehicleRepository
    ) { }

    async register({ nome, email, celular, cpf, placaDoCarro, senha }: IRegisterRequest) {
        const userAlreadyExists = await this.userRepository.buscarPorEmail(email);

        if (userAlreadyExists) {
            throw new Error('User already exists');
        }

        const passwordHash = await hash(senha, 8);

        const user = User.criar({
            id: uuidV4(),
            nome,
            email,
            celular,
            cpf,
            senhaHash: passwordHash,
            creditoSaldo: 0,
            criadoEm: new Date(),
        });

        await this.userRepository.criar(user);

        if (placaDoCarro) {
            await this.userVehicleRepository.adicionarVeiculo(user.id, placaDoCarro);
        }
    }

    async login({ email, senha }: ILoginRequest) {
        const user = await this.userRepository.buscarPorEmail(email);

        if (!user) {
            throw new Error('Email or password incorrect');
        }

        const passwordMatch = await compare(senha, user.senhaHash);

        if (!passwordMatch) {
            throw new Error('Email or password incorrect');
        }

        const token = sign({ email: user.email }, 'hackathon-secret-key', { // TODO: env
            subject: user.id,
            expiresIn: '1d',
        });

        return {
            user: {
                nome: user.nome,
                email: user.email,
            },
            token,
        };
    }
}
