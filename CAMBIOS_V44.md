# V44 · Colaboradores y perfiles seguros

## Hallazgo
La V43 incluía el botón «Generar invitación» que llamaba a `/functions/v1/manage-collaborators`, pero el proyecto no distribuía el código de esta Edge Function. El error `Failed to fetch` también puede aparecer por CORS, por falta de despliegue o por restricciones de red. Esta versión aporta la función y mensajes de diagnóstico.

## Instalación OBLIGATORIA (el ZIP por sí solo no activa la gestión)

1. Subí la web y los archivos a GitHub.
2. En Supabase → SQL Editor, ejecutá **`supabase/migration_v44_users.sql`**.
3. En Supabase → Edge Functions, desplegá **`supabase/functions/manage-collaborators/index.ts`** con nombre `manage-collaborators`. Ejemplo por CLI tras vincular el proyecto: `supabase functions deploy manage-collaborators`.
4. **Mantener activada la verificación JWT** en esa Edge Function. La función además verifica al usuario con `auth.getUser` y consulta su rol directamente en `cms_profiles`.
5. Las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` deben existir **únicamente como secretos del entorno de Supabase** (Supabase suministra los secretos predeterminados para sus proyectos). **Jamás coloques la service_role en la web o en GitHub Pages**.
6. En Supabase → Authentication → URL Configuration, agregá `https://foroeconomiadelvisitante.com.ar/admin/` a Redirect URLs. Opcional: configurá `FORO_INVITE_REDIRECT_URL` en los secretos de la función con esa URL exacta. De lo contrario la invitación usa la Site URL configurada en Supabase. Probá la invitación con un correo nuevo.
7. Si Supabase Auth usa SMTP sin proveedor personalizado, revisá los límites de envío de correo del proyecto. Las invitaciones reales dependen de ese servicio.

## Comportamiento
- Admin: invitar con rol; listar colaboradores; editar nombre, organización, bio, foto (URL HTTPS) y rol; activar/desactivar; eliminar definitivamente con confirmación `ELIMINAR`.
- Mi perfil: cualquier usuario con acceso edita su nombre, organización, biografía, imagen y contraseña (opcional). Nunca puede autoasignarse roles.
- Bloqueo inmediato de operaciones de CMS mediante la función `foro_role()`: un usuario deshabilitado deja de tener un rol efectivo en RLS incluso cuando conserve una sesión anterior.
- Se bloquea la autoeliminación, autodeshabilitación y autopérdida del rol administrador. Se evita eliminar o degradar al último administrador activo.
- Las operaciones privilegiadas ocurren en Edge Functions usando service role solo en el servidor. El navegador solo envía el JWT del usuario.

## Diagnóstico `Failed to fetch`
1. Comprobar en Supabase → Edge Functions que exista `manage-collaborators` y esté desplegada.
2. Revisar logs de esa función y la pestaña Network del navegador al invitar.
3. Confirmar el resultado del `OPTIONS` (CORS) y del `POST`; `401/403` significan autenticación/rol, `404` sugiere función inexistente, `5xx` un error interno.
4. Si un colaborador invitado no puede entrar, revisar Redirect URLs, correo recibido y que exista la fila correspondiente en `cms_profiles`.

## Seguridad y límites
- Las claves privadas jamás se usan en código público.
- La eliminación de un usuario en Supabase Auth puede ser irreversible y afectar relaciones de datos. Revisá los registros relacionados antes de eliminar una cuenta productiva.
- Esta versión añade foto por URL pública HTTPS (puede copiarse desde la biblioteca de medios). No modifica las imágenes de autor de los artículos existentes.
- Comprobación local de sintaxis JS y contenido ZIP realizada; el flujo completo con Auth real requiere validación posterior al despliegue.
