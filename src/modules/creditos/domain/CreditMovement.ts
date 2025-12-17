export class CreditMovement {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly tipo: 'CREDITO_MANUAL' | 'CREDITO_SOBRA_DESCONTO' | 'USO_CREDITO_NO_TICKET',
        public readonly valor: number,
        public readonly direcao: 'ENTRADA' | 'SAIDA',
        public readonly referenciaTicketId: string | null,
        public readonly referenciaNfChave: string | null,
        public readonly descricao: string | null,
        public readonly criadoEm: Date
    ) { }

    static criar(props: {
        id: string;
        userId: string;
        tipo: 'CREDITO_MANUAL' | 'CREDITO_SOBRA_DESCONTO' | 'USO_CREDITO_NO_TICKET';
        valor: number;
        direcao: 'ENTRADA' | 'SAIDA';
        referenciaTicketId?: string | null;
        referenciaNfChave?: string | null;
        descricao?: string | null;
        criadoEm: Date;
    }): CreditMovement {
        return new CreditMovement(
            props.id,
            props.userId,
            props.tipo,
            props.valor,
            props.direcao,
            props.referenciaTicketId || null,
            props.referenciaNfChave || null,
            props.descricao || null,
            props.criadoEm
        );
    }
}
