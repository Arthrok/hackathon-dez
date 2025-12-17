## **1) Árvore de pastas final**

```
hackathon/
├── docker/
│   └── init.sql
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   └── env.ts
│   ├── db/
│   │   └── pg.ts
│   ├── integrations/
│   │   └── serpro/
│   │       ├── SerproClient.ts
│   │       ├── SerproController.ts
│   │       └── serpro.routes.ts
│   └── modules/
│       ├── nota-fiscal/
│       │   ├── application/
│       │   │   ├── BuscarNotaFiscalPorId.ts
│       │   │   └── CriarNotaFiscal.ts
│       │   ├── domain/
│       │   │   ├── NotaFiscal.ts
│       │   │   └── NotaFiscalRepository.ts
│       │   ├── http/
│       │   │   ├── NotaFiscalController.ts
│       │   │   └── notaFiscal.routes.ts
│       │   └── infra/
│       │       └── PgNotaFiscalRepository.ts
│       └── tickets/
│           ├── application/
│           │   ├── AplicarDescontoPorNf.ts
│           │   ├── BuscarTicketPorId.ts
│           │   ├── ConsultarPagamento.ts
│           │   ├── CriarTicket.ts
│           │   ├── ListarDescontosPorTicket.ts
│           │   ├── ListarTicketTipos.ts
│           │   └── ProcessarPagamento.ts
│           ├── domain/
│           │   ├── CepScsRepository.ts
│           │   ├── NotaFiscalRepository.ts
│           │   ├── Ticket.ts
│           │   ├── TicketDescontoRepository.ts
│           │   ├── TicketPagamentoRepository.ts
│           │   ├── TicketRepository.ts
│           │   ├── TicketTipo.ts
│           │   └── TicketTipoRepository.ts
│           ├── http/
│           │   ├── ticket.routes.ts
│           │   ├── TicketController.ts
│           │   ├── TicketDescontoController.ts
│           │   ├── TicketPagamentoController.ts
│           │   └── TicketTipoController.ts
│           └── infra/
│               ├── PgCepScsRepository.ts
│               ├── PgNotaFiscalRepository.ts
│               ├── PgTicketDescontoRepository.ts
│               ├── PgTicketPagamentoRepository.ts
│               ├── PgTicketRepository.ts
│               └── PgTicketTipoRepository.ts
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

## **2) SQL init completo**

Já está em `docker/init.sql` com todas as tabelas, constraints, índices e dados iniciais.

## **3) Exemplos de curl para cada endpoint**

### **A) Tipos de ticket**

```bash
# GET /ticket-tipos
curl -X GET "http://localhost:3000/ticket-tipos" \
  -H "accept: application/json"
```

### **B) Tickets**

```bash
# POST /tickets
curl -X POST "http://localhost:3000/tickets" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoHoras": 2,
    "timestampEntrada": "2025-12-17T10:00:00-03:00",
    "placaDoCarro": "ABC1D23"
  }'

# GET /tickets/:id (use o ID retornado no POST acima)
curl -X GET "http://localhost:3000/tickets/SEU_TICKET_ID_AQUI" \
  -H "accept: application/json"
```

### **C) Descontos por NF**

```bash
# POST /tickets/:id/descontos (use o ID do ticket criado acima)
curl -X POST "http://localhost:3000/tickets/SEU_TICKET_ID_AQUI/descontos" \
  -H "Content-Type: application/json" \
  -d '{
    "chave": "31170309339936000973550250002397736362483965"
  }'

# GET /tickets/:id/descontos
curl -X GET "http://localhost:3000/tickets/SEU_TICKET_ID_AQUI/descontos" \
  -H "accept: application/json"
```

### **D) Pagamento**

```bash
# GET /tickets/:id/pagamento
curl -X GET "http://localhost:3000/tickets/SEU_TICKET_ID_AQUI/pagamento" \
  -H "accept: application/json"

# POST /tickets/:id/pagamento (com Idempotency-Key)
curl -X POST "http://localhost:3000/tickets/SEU_TICKET_ID_AQUI/pagamento" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: meu-token-unico-123" \
  -d '{
    "metodo": "pix"
  }'
```

## **4) Comandos para rodar**

### **Local (sem Docker)**

```bash
# Instalar dependências
npm install

# Criar .env na raiz com:
# PORT=3000
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
# SERPRO_BASE_URL=https://gateway.apiserpro.serpro.gov.br/consulta-nfe-df-trial
# SERPRO_BEARER_TOKEN=SEU_TOKEN

# Rodar em dev (com watch)
npm run dev

# Build
npm run build

# Rodar produção
npm start
```

### **Docker**

```bash
# Criar .env na raiz (mesmo conteúdo acima, mas DATABASE_URL com "db" ao invés de "localhost")

# Build e subir tudo
docker compose up --build

# Ou separado:
docker compose build
docker compose up

# Parar
docker compose down

# Parar e remover volumes
docker compose down -v
```

## **5) Como inserir novos CEPs SCS**

```sql
-- Conectar no banco
docker exec -it nota_fiscal_db psql -U postgres -d app

-- Inserir novo CEP
INSERT INTO ceps_scs (cep, ativo) VALUES ('70060000', true);

-- Desativar CEP
UPDATE ceps_scs SET ativo = false WHERE cep = '70060000';

-- Listar todos
SELECT * FROM ceps_scs;
```

## **6) Observações importantes**

1. Transações: o código usa `FOR UPDATE` para locks, garantindo concorrência.
2. Parsing SERPRO: extrai `vNF` (fallback `vProd`), timestamp (dhEmi → dhSaiEnt → dhRecbto) e CEP normalizado.
3. Validações: CEP ativo, timestamp dentro do intervalo do ticket, NF usada apenas uma vez.
4. Idempotência: pagamentos suportam `Idempotency-Key` no header.
5. Cálculo de desconto: `round(valor_nf * 0.10, 2)`.

Pronto. Todos os arquivos foram criados e o projeto está funcional. Teste com os curls acima.