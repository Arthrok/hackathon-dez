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


## **7) Documentação da API (Rotas e Parâmetros)**

### **Auth** (`/auth`)
| Método | Rota | Descrição | Parâmetros (Body/Query) |
|---|---|---|---|
| POST | `/auth/register` | Cadastra novo usuário | **Body (JSON):**<br>- `nome` (Obrigatório)<br>- `email` (Obrigatório)<br>- `senha` (Obrigatório)<br>- `celular` (Obrigatório)<br>- `cpf` (Obrigatório)<br>- `placaDoCarro` (Opcional - para cadastro simultâneo de veículo) |
| POST | `/auth/login` | Realiza login | **Body (JSON):**<br>- `email` (Obrigatório)<br>- `senha` (Obrigatório) |

### **Usuários** (`/` e `/me`)
*Necessita Header `Authorization: Bearer <token>`*

| Método | Rota | Descrição | Parâmetros |
|---|---|---|---|
| GET | `/me` | Dados do usuário logado | - |
| GET | `/me/tickets` | Histórico de tickets | **Query Params:**<br>- `status` (Opcional: ABERTO, PAGO, CANCELADO)<br>- `limit` (Opcional: default 20)<br>- `offset` (Opcional: default 0) |
| GET | `/me/tickets/ativo` | Busca ticket ativo (se houver) | - |

### **Créditos** (`/me/creditos`)
*Necessita Header `Authorization: Bearer <token>`*

| Método | Rota | Descrição | Parâmetros |
|---|---|---|---|
| POST | `/me/creditos` | Adiciona crédito (Simulação) | **Body (JSON):**<br>- `valor` (Obrigatório: number)<br>- `descricao` (Opcional: string) |
| GET | `/me/creditos` | Saldo e extrato | - |

### **Tickets** (`/` e `/tickets`)
| Método | Rota | Descrição | Parâmetros |
|---|---|---|---|
| GET | `/ticket-tipos` | Lista tipos (1h to 4h) | - |
| POST | `/tickets` | Cria um novo ticket | *Auth Obrigatória*<br>**Body (JSON):**<br>- `tipoHoras` (Obrigatório: 1-4)<br>- `timestampEntrada` (Obrigatório: ISO8601)<br>- `placaDoCarro` (Opcional se usuário já tiver veículo)<br>- `usarCredito` (Obrigatório: boolean) |
| GET | `/tickets/:id` | Detalhes do ticket | *Auth Obrigatória*<br>**Path:** `id` (UUID) |
| POST | `/tickets/:id/descontos` | Aplica desconto via NF | *Auth Obrigatória*<br>**Path:** `id`<br>**Body (JSON):**<br>- `chave` (Obrigatório: 44 dígitos string) |
| GET | `/tickets/:id/descontos` | Lista descontos do ticket | *Auth Obrigatória*<br>**Path:** `id` |
| GET | `/tickets/:id/pagamento` | Status pagamento | *Auth Obrigatória*<br>**Path:** `id` |
| POST | `/tickets/:id/pagamento` | Processa pagamento | *Auth Obrigatória*<br>**Path:** `id`<br>**Body (JSON):**<br>- `metodo` (Obrigatório: 'cartao', 'pix', 'dinheiro')<br>**Header:** `Idempotency-Key` (Opcional) |

### **Nota Fiscal** (`/nota-fiscal`)
| Método | Rota | Descrição | Parâmetros |
|---|---|---|---|
| POST | `/nota-fiscal` | Cria NF (Mock) | **Body (JSON):**<br>- `valor` (Obrigatório)<br>- `clienteId` (Opcional) |
| GET | `/nota-fiscal/:id` | Busca NF | **Path:** `id` |