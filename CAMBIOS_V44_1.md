# V44.1 · Diagnóstico de acceso de administrador

La V44 no distinguía los errores de RLS/tabla de perfiles de un perfil CMS inexistente y cerraba la sesión automáticamente.

La V44.1 mejora los mensajes y mantiene las comprobaciones de autorización. No crea cuentas privilegiadas desde el navegador ni desactiva RLS.

## Recuperación
1. Verificá que `migration_v44_users.sql` se haya ejecutado correctamente.
2. En Supabase → Authentication → Users, comprobá el email de la cuenta admin.
3. En Supabase → SQL Editor ejecutá PRIMERO el SELECT de `supabase/recuperar_admin_v44_1.sql`, reemplazando el marcador por el correo confirmado.
4. Solo si el perfil no existe, está deshabilitado o perdió el rol por la migración, ejecutá el bloque DO y verificá el último SELECT.
5. Subí los archivos V44.1 a GitHub y volvé a iniciar sesión.

Si el SELECT ya indica admin / true, no ejecutes la recuperación: revisá la consola y permisos de lectura del perfil.

**Seguridad:** aplicar el bloque de recuperación solo al administrador cuya identidad está verificada por el propietario de Supabase.
