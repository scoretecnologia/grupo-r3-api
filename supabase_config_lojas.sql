-- ==============================================================================
-- 1. Criação da Tabela de Servidores (Matrizes)
-- ==============================================================================
CREATE TABLE public.grupo_r3_servidores (
    servidor_id INT PRIMARY KEY,
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    carga_completa BOOLEAN DEFAULT false NOT NULL, -- true: histórico completo (desde 2025) / false: usa mes_referencia
    mes_referencia VARCHAR(7) DEFAULT '2026-06', -- formato YYYY-MM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.grupo_r3_servidores IS 'Tabela de servidores (lojas matrizes) do Grupo R3.';

-- ==============================================================================
-- 2. Criação da Tabela de Sublojas (Cidades)
-- ==============================================================================
CREATE TABLE public.grupo_r3_sublojas (
    cidade_id INT PRIMARY KEY,
    servidor_id INT NOT NULL REFERENCES public.grupo_r3_servidores(servidor_id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    carga_completa BOOLEAN DEFAULT false NOT NULL, -- true: histórico completo (desde 2025) / false: usa mes_referencia
    mes_referencia VARCHAR(7) DEFAULT '2026-06', -- formato YYYY-MM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.grupo_r3_sublojas IS 'Tabela de sublojas interligadas aos seus respectivos servidores.';
COMMENT ON COLUMN public.grupo_r3_sublojas.servidor_id IS 'Chave estrangeira que liga a subloja ao servidor principal.';

-- ==============================================================================
-- INSERTS: Servidores (Matrizes)
-- ==============================================================================
INSERT INTO public.grupo_r3_servidores (servidor_id, nome, ativo, carga_completa) VALUES 
(1, 'Santa Quitéria', true, false),
(2, 'Guaraciaba', true, false),
(3, 'Crateús', true, false),
(4, 'Ipu', true, false),
(5, 'Piripiri', true, false),
(6, 'Pedro II', true, false),
(7, 'São Bernardo', true, false),
(8, 'Varjota', true, false),
(9, 'Camocim', true, false),
(10, 'Barras', true, false),
(11, 'Boa Viagem', true, false),
(12, 'Canindé', true, false),
(13, 'São Benedito', true, false),
(14, 'Sobral', true, false),
(15, 'Tianguá', true, false),
(19, 'Martinopole', true, false),
(20, 'Granja', true, false),
(21, 'Pedra Branca', true, false),
(22, 'São João da Fronteira', true, false),
(23, 'Quixeramobim', true, false),
(24, 'Maraba', true, false),
(26, 'Pitbull', true, false),
(27, 'Barroquinha', true, false),
(28, 'Barreirinhas', true, false),
(29, 'Mucambo', true, false),
(30, 'Pacujá', true, false),
(32, 'Hidrolândia', true, false),
(33, 'Croatá', true, false),
(35, 'Domingo Mourão', true, false),
(36, 'Piracuruca', true, false),
(37, 'Petrolina', true, false),
(38, 'Parazinho', true, false),
(39, 'Alto Lindo', true, false),
(43, 'Marco', true, false),
(44, 'Catunda', true, false),
(45, 'Poranga', true, false),
(46, 'Centro de Piripiri', true, false),
(47, 'Baturite', true, false),
(48, 'Juazeiro do Norte', true, false),
(49, 'Tamboril', true, false),
(50, 'Guaraciaba Nova', true, false),
(51, 'Chaval', true, false),
(52, 'São Miguel', true, false),
(53, 'Campanario', true, false),
(54, 'Acarape', true, false),
(55, 'Jijoca', true, false),
(56, 'Trairi', true, false),
(57, 'Senador Pompeu', true, false),
(58, 'Moraújo', true, false),
(59, 'Pimenteiras', true, false),
(60, 'Carnaubal', true, false);

-- ==============================================================================
-- INSERTS: Sublojas
-- ==============================================================================
INSERT INTO public.grupo_r3_sublojas (cidade_id, servidor_id, nome, ativo, carga_completa) VALUES 
(7, 2, 'Carnaúbal', true, false),
(8, 2, 'São Benedito', true, false),
(9, 2, 'Morrinhos', true, false),
(10, 2, 'Croata', true, false),
(11, 2, 'Viçosa', true, false),
(12, 2, 'Cocal', true, false),
(13, 1, 'Nova Russas', true, false),
(14, 1, 'Monsenhor Tabosa', true, false),
(15, 1, 'Ipueiras', true, false),
(16, 1, 'Catunda', true, false),
(17, 1, 'Tamboril', true, false),
(18, 1, 'Nova Fátima', true, false),
(19, 3, 'Sucesso', true, false),
(20, 3, 'Murruais', true, false),
(21, 3, 'Buriti dos Montes', true, false),
(22, 3, 'Assunção', true, false),
(23, 3, 'Castelo do Piaui', true, false),
(26, 5, 'Centro de Piripiri', true, false),
(27, 5, 'Atacadão dos Plásticos', true, false),
(28, 6, 'Esperantina', true, false),
(29, 6, 'Batalha', true, false),
(30, 6, 'Luzilândia', true, false),
(31, 7, 'Tutóia', true, false),
(32, 8, 'Groairas', true, false),
(33, 13, 'São Benedito 2', true, false),
(35, 3, 'Novo Oriente', true, false),
(36, 3, 'Quiterianópolis', true, false),
(37, 22, 'São João do Divino', true, false),
(38, 5, 'Matias Olimpio', true, false),
(39, 2, 'Reriutaba', true, false),
(41, 8, 'Cariré', true, false),
(42, 38, 'Timonha', true, false);
