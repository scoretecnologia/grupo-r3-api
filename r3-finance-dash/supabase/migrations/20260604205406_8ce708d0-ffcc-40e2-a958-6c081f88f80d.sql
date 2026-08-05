
CREATE TABLE public.grupo_r3_servidores (
  servidor_id INT PRIMARY KEY,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  carga_completa BOOLEAN NOT NULL DEFAULT false,
  mes_referencia VARCHAR(7) NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.grupo_r3_sublojas (
  cidade_id INT PRIMARY KEY,
  servidor_id INT NOT NULL REFERENCES public.grupo_r3_servidores(servidor_id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  carga_completa BOOLEAN NOT NULL DEFAULT false,
  mes_referencia VARCHAR(7) NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sublojas_servidor_id ON public.grupo_r3_sublojas(servidor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_servidores TO anon, authenticated;
GRANT ALL ON public.grupo_r3_servidores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_sublojas TO anon, authenticated;
GRANT ALL ON public.grupo_r3_sublojas TO service_role;

ALTER TABLE public.grupo_r3_servidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_r3_sublojas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read servidores" ON public.grupo_r3_servidores FOR SELECT USING (true);
CREATE POLICY "Public can insert servidores" ON public.grupo_r3_servidores FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update servidores" ON public.grupo_r3_servidores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete servidores" ON public.grupo_r3_servidores FOR DELETE USING (true);

CREATE POLICY "Public can read sublojas" ON public.grupo_r3_sublojas FOR SELECT USING (true);
CREATE POLICY "Public can insert sublojas" ON public.grupo_r3_sublojas FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update sublojas" ON public.grupo_r3_sublojas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete sublojas" ON public.grupo_r3_sublojas FOR DELETE USING (true);
