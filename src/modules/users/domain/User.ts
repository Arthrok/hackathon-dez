export class User {
    constructor(
        public readonly id: string,
        public readonly nome: string,
        public readonly email: string,
        public readonly celular: string,
        public readonly cpf: string,

        public readonly senhaHash: string,
        public readonly creditoSaldo: number,
        public readonly criadoEm: Date
    ) { }

    static criar(props: {
        id: string;
        nome: string;
        email: string;
        celular: string;
        cpf: string;
        senhaHash: string;
        creditoSaldo: number;
        criadoEm: Date;
    }): User {
        return new User(
            props.id,
            props.nome,
            props.email,
            props.celular,
            props.cpf,
            props.senhaHash,
            props.creditoSaldo,
            props.criadoEm
        );
    }
}
