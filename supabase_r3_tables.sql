-- ==============================================================================
-- 📊 SCHEMA COMPLETO DO BANCO DE DADOS - GRUPO R3 (SUPABASE POSTGRESQL)
-- Idempotente (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS). Atualizado em 2026-10-01
-- a partir do banco em producao: inclui enriquecimento do DRE, de-para e parceiros.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Tabela de Servidores (Lojas Matrizes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grupo_r3_servidores (
    servidor_id INT PRIMARY KEY,
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    carga_completa BOOLEAN DEFAULT false NOT NULL,
    mes_referencia VARCHAR(7) DEFAULT '2026-06',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.grupo_r3_servidores IS 'Tabela de servidores (lojas matrizes) do Grupo R3.';

-- ------------------------------------------------------------------------------
-- 2. Tabela de Sublojas (Filiais / Cidades)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grupo_r3_sublojas (
    cidade_id INT PRIMARY KEY,
    servidor_id INT NOT NULL REFERENCES public.grupo_r3_servidores(servidor_id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    carga_completa BOOLEAN DEFAULT false NOT NULL,
    mes_referencia VARCHAR(7) DEFAULT '2026-06',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.grupo_r3_sublojas IS 'Tabela de sublojas interligadas aos seus respectivos servidores.';

-- ------------------------------------------------------------------------------
-- 3. Tabela de Usuários e Permissões (vínculo com auth.users)
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'normal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.grupo_r3_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role public.app_role DEFAULT 'normal'::public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. Tabela de DRE Detalhado
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grupo_r3_dre_detalhado (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_servidor INT NOT NULL REFERENCES public.grupo_r3_servidores(servidor_id) ON DELETE CASCADE,
    id_cidade INT NULL REFERENCES public.grupo_r3_sublojas(cidade_id) ON DELETE CASCADE,
    loja TEXT NOT NULL,
    cidade TEXT NOT NULL,
    mes_inicio DATE NOT NULL,
    mes_fim DATE NOT NULL,
    codigo_conta TEXT,
    descricao_conta TEXT,
    categoria TEXT,
    -- Enriquecimento via de-para (grupo_r3_plano_contas_depara), preenchido pelo ETL no insert
    conta_padronizada TEXT,
    grupo_dre TEXT,
    natureza TEXT,
    debito NUMERIC(15, 2) DEFAULT 0.00,
    credito NUMERIC(15, 2) DEFAULT 0.00,
    valor_liquido NUMERIC(15, 2) DEFAULT 0.00,
    dados_extra JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dre_servidor_cidade ON public.grupo_r3_dre_detalhado (id_servidor, id_cidade);
CREATE INDEX IF NOT EXISTS idx_dre_periodo ON public.grupo_r3_dre_detalhado (mes_inicio, mes_fim);
CREATE INDEX IF NOT EXISTS idx_dre_codigo_conta ON public.grupo_r3_dre_detalhado (codigo_conta);
CREATE INDEX IF NOT EXISTS idx_dre_categoria ON public.grupo_r3_dre_detalhado (categoria);
CREATE INDEX IF NOT EXISTS idx_dre_grupo_dre ON public.grupo_r3_dre_detalhado (grupo_dre);

-- Bancos criados antes do enriquecimento: adiciona as colunas sem recriar a tabela
ALTER TABLE public.grupo_r3_dre_detalhado ADD COLUMN IF NOT EXISTS conta_padronizada TEXT;
ALTER TABLE public.grupo_r3_dre_detalhado ADD COLUMN IF NOT EXISTS grupo_dre TEXT;
ALTER TABLE public.grupo_r3_dre_detalhado ADD COLUMN IF NOT EXISTS natureza TEXT;

-- ------------------------------------------------------------------------------
-- 5. Tabela de Faturamento por Loja
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grupo_r3_faturamento_loja (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_servidor INT NOT NULL REFERENCES public.grupo_r3_servidores(servidor_id) ON DELETE CASCADE,
    id_cidade INT NULL REFERENCES public.grupo_r3_sublojas(cidade_id) ON DELETE CASCADE,
    loja TEXT NOT NULL,
    cidade TEXT NOT NULL,
    mes_inicio DATE NOT NULL,
    mes_fim DATE NOT NULL,
    codigo_loja INT,
    total_faturamento NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fat_servidor_cidade ON public.grupo_r3_faturamento_loja (id_servidor, id_cidade);
CREATE INDEX IF NOT EXISTS idx_fat_periodo ON public.grupo_r3_faturamento_loja (mes_inicio, mes_fim);

-- ------------------------------------------------------------------------------
-- 6. De-Para do Plano de Contas (gerido na aba "Plano de Contas" do dashboard)
--    O ETL le apenas as regras com ativo = true e casa `conta_origem` com
--    `descricao_conta` apos normalizar (trim, espacos simples, maiusculas).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grupo_r3_plano_contas_depara (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conta_origem TEXT NOT NULL UNIQUE,          -- descricao como vem da API Continental (normalizada)
    conta_padronizada TEXT NOT NULL,            -- nome gerencial exibido na DRE
    grupo_dre TEXT NOT NULL,                    -- ex: Despesas Administrativas, Avarias, Impostos...
    subgrupo TEXT,
    tipo TEXT NOT NULL DEFAULT 'DESPESA',       -- DESPESA | RECEITA | ...
    ordem_grupo INT NOT NULL DEFAULT 99,
    ordem_conta INT NOT NULL DEFAULT 999,
    natureza TEXT NOT NULL DEFAULT 'Despesa Fixa', -- Despesa Fixa | Despesa Variavel | Investimento | Nao Operacional
    ativo BOOLEAN NOT NULL DEFAULT true,        -- o dashboard inativa em vez de apagar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.grupo_r3_plano_contas_depara ADD COLUMN IF NOT EXISTS natureza TEXT NOT NULL DEFAULT 'Despesa Fixa';
ALTER TABLE public.grupo_r3_plano_contas_depara ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_depara_ativo ON public.grupo_r3_plano_contas_depara (ativo);

-- ------------------------------------------------------------------------------
-- 7. Regras de comissao de parceiros (aba "Parceiros" do dashboard)
--    Percentual aplicado na apuracao da DRE por loja/filial.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grupo_r3_parceiros_regras (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parceiro_nome TEXT NOT NULL,
    servidor_id INT NULL REFERENCES public.grupo_r3_servidores(servidor_id) ON DELETE SET NULL,
    servidor_nome TEXT,
    cidade_id INT NULL REFERENCES public.grupo_r3_sublojas(cidade_id) ON DELETE SET NULL,
    cidade_nome TEXT,
    percentual_comissao NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    observacao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parceiros_servidor_cidade ON public.grupo_r3_parceiros_regras (servidor_id, cidade_id);

-- ------------------------------------------------------------------------------
-- 8. Habilitação de RLS e Permissões
-- ------------------------------------------------------------------------------
ALTER TABLE public.grupo_r3_servidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_r3_sublojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_r3_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_r3_dre_detalhado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_r3_faturamento_loja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_r3_plano_contas_depara ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_r3_parceiros_regras ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_servidores TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_sublojas TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_users TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_dre_detalhado TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_faturamento_loja TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_plano_contas_depara TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_parceiros_regras TO anon, authenticated, service_role;

-- Políticas RLS genéricas para acesso aos relatórios
DROP POLICY IF EXISTS "Permitir leitura publica em servidores" ON public.grupo_r3_servidores;
CREATE POLICY "Permitir leitura publica em servidores" ON public.grupo_r3_servidores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura publica em sublojas" ON public.grupo_r3_sublojas;
CREATE POLICY "Permitir leitura publica em sublojas" ON public.grupo_r3_sublojas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir leitura publica/autenticada no DRE" ON public.grupo_r3_dre_detalhado;
CREATE POLICY "Permitir leitura publica/autenticada no DRE" ON public.grupo_r3_dre_detalhado FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento total do DRE" ON public.grupo_r3_dre_detalhado;
CREATE POLICY "Permitir gerenciamento total do DRE" ON public.grupo_r3_dre_detalhado FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura publica/autenticada no Faturamento" ON public.grupo_r3_faturamento_loja;
CREATE POLICY "Permitir leitura publica/autenticada no Faturamento" ON public.grupo_r3_faturamento_loja FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento total do Faturamento" ON public.grupo_r3_faturamento_loja;
CREATE POLICY "Permitir gerenciamento total do Faturamento" ON public.grupo_r3_faturamento_loja FOR ALL USING (true) WITH CHECK (true);

-- De-Para: leitura para o ETL (anon) e gestao pelo dashboard (autenticado)
DROP POLICY IF EXISTS "Permitir leitura publica no De-Para" ON public.grupo_r3_plano_contas_depara;
CREATE POLICY "Permitir leitura publica no De-Para" ON public.grupo_r3_plano_contas_depara FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento do De-Para" ON public.grupo_r3_plano_contas_depara;
CREATE POLICY "Permitir gerenciamento do De-Para" ON public.grupo_r3_plano_contas_depara FOR ALL USING (true) WITH CHECK (true);

-- Parceiros: leitura e gestao pelo dashboard
DROP POLICY IF EXISTS "Permitir leitura publica em Parceiros" ON public.grupo_r3_parceiros_regras;
CREATE POLICY "Permitir leitura publica em Parceiros" ON public.grupo_r3_parceiros_regras FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir gerenciamento de Parceiros" ON public.grupo_r3_parceiros_regras;
CREATE POLICY "Permitir gerenciamento de Parceiros" ON public.grupo_r3_parceiros_regras FOR ALL USING (true) WITH CHECK (true);
