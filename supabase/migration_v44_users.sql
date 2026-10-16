-- V44: ejecutar desde Supabase SQL Editor con permisos de propietario.
ALTER TABLE public.cms_profiles ADD COLUMN IF NOT EXISTS organization text NOT NULL DEFAULT '';
ALTER TABLE public.cms_profiles ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
ALTER TABLE public.cms_profiles ADD COLUMN IF NOT EXISTS avatar_url text NOT NULL DEFAULT '';
ALTER TABLE public.cms_profiles ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;

-- El rol efectivo debe depender siempre del estado activo, incluso con un JWT vigente.
CREATE OR REPLACE FUNCTION public.foro_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT role FROM public.cms_profiles WHERE user_id=auth.uid() AND enabled=true LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.foro_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foro_role() TO authenticated;
-- El cliente solo lee perfiles según RLS; únicamente la Edge Function (service_role) edita.
REVOKE INSERT,UPDATE,DELETE ON public.cms_profiles FROM anon,authenticated;
DROP POLICY IF EXISTS "Admin or self read profiles" ON public.cms_profiles;
CREATE POLICY "Admin or self read profiles" ON public.cms_profiles FOR SELECT TO authenticated
 USING (user_id=auth.uid() OR public.foro_role()='admin');
