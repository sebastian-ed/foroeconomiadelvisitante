-- RECUPERACIÓN V44.1 — ejecutar ÚNICAMENTE desde Supabase SQL Editor,
-- con cuenta propietaria del proyecto, después de comprobar que el correo
-- corresponde efectivamente al administrador original.
-- No ejecutar desde el navegador ni incrustar este SQL en el sitio.

-- Diagnóstico primero:
SELECT u.id, u.email, p.role, p.enabled, p.user_id AS profile_user_id
FROM auth.users u
LEFT JOIN public.cms_profiles p ON p.user_id = u.id
WHERE lower(u.email) = lower('REEMPLAZAR_POR_EL_EMAIL_DEL_ADMIN');

-- Si confirmaste la identidad del administrador, ejecutá el bloque siguiente.
-- El guardado de usuarios solo se concede desde el SQL Editor privilegiado.
DO $$
DECLARE admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users
  WHERE lower(email)=lower('REEMPLAZAR_POR_EL_EMAIL_DEL_ADMIN')
  LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No existe el correo indicado en auth.users. Verificá el email real en Authentication > Users';
  END IF;
  INSERT INTO public.cms_profiles (user_id, display_name, role, enabled)
  SELECT u.id, coalesce(nullif(u.raw_user_meta_data->>'full_name',''),u.email), 'admin', true
  FROM auth.users u WHERE u.id=admin_id
  ON CONFLICT (user_id) DO UPDATE SET role='admin', enabled=true;
END $$;

-- Verificación posterior: debe devolver una sola fila con admin / true.
SELECT u.email, p.role, p.enabled FROM auth.users u
JOIN public.cms_profiles p ON p.user_id=u.id
WHERE lower(u.email)=lower('REEMPLAZAR_POR_EL_EMAIL_DEL_ADMIN');
