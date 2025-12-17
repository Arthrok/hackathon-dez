CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de tipos de ticket
CREATE TABLE IF NOT EXISTS ticket_tipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horas INTEGER NOT NULL UNIQUE CHECK (horas IN (1, 2, 3, 4)),
  preco_por_hora NUMERIC(12, 2) NOT NULL DEFAULT 5.75
);

-- Inserir tipos padrão
INSERT INTO ticket_tipos (horas, preco_por_hora) VALUES
  (1, 5.75),
  (2, 5.75),
  (3, 5.75),
  (4, 5.75)
ON CONFLICT (horas) DO NOTHING;

-- Tabela de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_id UUID NOT NULL REFERENCES ticket_tipos(id),
  status TEXT NOT NULL CHECK (status IN ('ABERTO', 'PAGO', 'CANCELADO')),
  valor_original NUMERIC(12, 2) NOT NULL,
  valor_atual NUMERIC(12, 2) NOT NULL CHECK (valor_atual >= 0),
  timestamp_entrada TIMESTAMPTZ NOT NULL,
  timestamp_saida TIMESTAMPTZ NOT NULL,
  placa_do_carro TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_tipo_id ON tickets(tipo_id);

-- Tabela de CEPs SCS (Sistema de Controle de Estacionamento)
CREATE TABLE IF NOT EXISTS ceps_scs (
  cep CHAR(8) PRIMARY KEY,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Inserir alguns CEPs de exemplo (Brasília - DF)
INSERT INTO ceps_scs (cep, ativo) VALUES
  ('72880000', true),
  ('70040000', true),
  ('70050000', true)
ON CONFLICT (cep) DO NOTHING;

-- Tabela de notas fiscais (guardar dados do SERPRO)
CREATE TABLE IF NOT EXISTS notas_fiscais (
  chave CHAR(44) PRIMARY KEY,
  valor_total NUMERIC(12, 2) NOT NULL,
  timestamp_nota TIMESTAMPTZ NOT NULL,
  cep_destinatario CHAR(8) NOT NULL,
  payload JSONB NOT NULL,
  usado_ticket_id UUID NULL REFERENCES tickets(id),
  usada_em TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_usado_ticket_id ON notas_fiscais(usado_ticket_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_cep ON notas_fiscais(cep_destinatario);

-- Tabela de descontos aplicados
CREATE TABLE IF NOT EXISTS ticket_descontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  nf_chave CHAR(44) NOT NULL REFERENCES notas_fiscais(chave),
  valor_desconto NUMERIC(12, 2) NOT NULL,
  aplicado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_descontos_nf_chave ON ticket_descontos(nf_chave);
CREATE INDEX IF NOT EXISTS idx_ticket_descontos_ticket_id ON ticket_descontos(ticket_id);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS ticket_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  valor_pago NUMERIC(12, 2) NOT NULL,
  pago_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  metodo TEXT NULL,
  idempotency_key TEXT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'CONFIRMADO'
);

CREATE INDEX IF NOT EXISTS idx_ticket_pagamentos_ticket_id ON ticket_pagamentos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_pagamentos_idempotency_key ON ticket_pagamentos(idempotency_key);

-- =========================================
-- NOVAS TABELAS E ALTERAÇÕES (REFACTOR)
-- =========================================

-- 1) Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  celular TEXT NOT NULL,
  cpf CHAR(11) NOT NULL UNIQUE,
  -- placa_do_carro REMOVED
  senha_hash TEXT NOT NULL,
  credito_saldo NUMERIC(12, 2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 1.5) Tabela de veículos do usuário
CREATE TABLE IF NOT EXISTS usuarios_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id),
  placa TEXT NOT NULL,
  tipo TEXT NULL, -- carro, moto, caminhao
  criado_em TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_user_vehicle UNIQUE (user_id, placa)
);

-- 2) Alteração na tabela tickets para vincular usuário
-- Adicionar coluna user_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='user_id') THEN
    ALTER TABLE tickets ADD COLUMN user_id UUID REFERENCES usuarios(id);
    -- NOTA: Se houver dados pré-existentes, isso falharia se fosse NOT NULL direto. 
    -- Para este hackathon, assumimos que podemos limpar ou que a migração roda em banco limpo.
    -- Se necessário limpar: TRUNCATE tickets CASCADE;
  END IF;
END $$;

-- Criar índice para user_id em tickets
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);

-- 3) Tabela de movimentos de crédito
CREATE TABLE IF NOT EXISTS creditos_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('CREDITO_MANUAL', 'CREDITO_SOBRA_DESCONTO', 'USO_CREDITO_NO_TICKET')),
  valor NUMERIC(12, 2) NOT NULL,
  direcao TEXT NOT NULL CHECK (direcao IN ('ENTRADA', 'SAIDA')),
  referencia_ticket_id UUID NULL REFERENCES tickets(id),
  referencia_nf_chave CHAR(44) NULL REFERENCES notas_fiscais(chave),
  descricao TEXT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creditos_movimentos_user_id ON creditos_movimentos(user_id, criado_em DESC);

-- 4) Alteração na tabela ticket_descontos
-- Adicionar colunas novas se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ticket_descontos' AND column_name='desconto_calculado') THEN
    ALTER TABLE ticket_descontos ADD COLUMN desconto_calculado NUMERIC(12, 2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ticket_descontos' AND column_name='desconto_aplicado_no_ticket') THEN
    ALTER TABLE ticket_descontos ADD COLUMN desconto_aplicado_no_ticket NUMERIC(12, 2) NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ticket_descontos' AND column_name='credito_gerado') THEN
    ALTER TABLE ticket_descontos ADD COLUMN credito_gerado NUMERIC(12, 2) NOT NULL DEFAULT 0;
  END IF;
END $$;
