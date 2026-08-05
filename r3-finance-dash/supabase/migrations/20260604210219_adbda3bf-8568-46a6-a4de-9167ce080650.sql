
-- Role enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'normal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table linked to auth.users
CREATE TABLE IF NOT EXISTS public.grupo_r3_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.grupo_r3_users TO authenticated;
GRANT ALL ON public.grupo_r3_users TO service_role;

ALTER TABLE public.grupo_r3_users ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.grupo_r3_users WHERE id = _user_id AND role = _role)
$$;

-- is_authorized: checks user exists in grupo_r3_users
CREATE OR REPLACE FUNCTION public.is_authorized(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.grupo_r3_users WHERE id = _user_id)
$$;

GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authorized TO authenticated;

-- Trigger: auto-create grupo_r3_users row on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.grupo_r3_users (id, email, role)
  VALUES (NEW.id, NEW.email, 'normal')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS policies for grupo_r3_users
DROP POLICY IF EXISTS "Users can view own row" ON public.grupo_r3_users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.grupo_r3_users;
DROP POLICY IF EXISTS "Admins can update users" ON public.grupo_r3_users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.grupo_r3_users;

CREATE POLICY "Users can view own row" ON public.grupo_r3_users
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON public.grupo_r3_users
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update users" ON public.grupo_r3_users
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete users" ON public.grupo_r3_users
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Replace public policies on grupo_r3_servidores
DROP POLICY IF EXISTS "Public can read servidores" ON public.grupo_r3_servidores;
DROP POLICY IF EXISTS "Public can insert servidores" ON public.grupo_r3_servidores;
DROP POLICY IF EXISTS "Public can update servidores" ON public.grupo_r3_servidores;
DROP POLICY IF EXISTS "Public can delete servidores" ON public.grupo_r3_servidores;
REVOKE ALL ON public.grupo_r3_servidores FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_servidores TO authenticated;

CREATE POLICY "Authorized users can read servidores" ON public.grupo_r3_servidores
  FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY "Admins can insert servidores" ON public.grupo_r3_servidores
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authorized users can update servidores" ON public.grupo_r3_servidores
  FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid())) WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY "Admins can delete servidores" ON public.grupo_r3_servidores
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Replace public policies on grupo_r3_sublojas
DROP POLICY IF EXISTS "Public can read sublojas" ON public.grupo_r3_sublojas;
DROP POLICY IF EXISTS "Public can insert sublojas" ON public.grupo_r3_sublojas;
DROP POLICY IF EXISTS "Public can update sublojas" ON public.grupo_r3_sublojas;
DROP POLICY IF EXISTS "Public can delete sublojas" ON public.grupo_r3_sublojas;
REVOKE ALL ON public.grupo_r3_sublojas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_r3_sublojas TO authenticated;

CREATE POLICY "Authorized users can read sublojas" ON public.grupo_r3_sublojas
  FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY "Admins can insert sublojas" ON public.grupo_r3_sublojas
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authorized users can update sublojas" ON public.grupo_r3_sublojas
  FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid())) WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY "Admins can delete sublojas" ON public.grupo_r3_sublojas
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
