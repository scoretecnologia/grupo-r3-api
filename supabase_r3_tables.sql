-- ==============================================================================
-- 📊 SCHEMA COMPLETO DO BANCO DE DADOS - GRUPO R3 (SUPABASE POSTGRESQL)
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
-- 6. Habilitação de RLS e Permissões
-- ------------------------------------------------------------------------------
ALTER TABLE public.grupo_r3_servidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_r3_sublojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_r3_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_r3_dre_detalhado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_r3_faturamento_loja ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_servidores TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_sublojas TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_users TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_dre_detalhado TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_faturamento_loja TO anon, authenticated, service_role;

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
