# V45 — Invitaciones y contraseñas

- Invita al dominio oficial, no a localhost: `https://foroeconomiadelvisitante.com.ar/admin/acceso.html`.
- Página de aceptación/recuperación donde el usuario establece y confirma contraseña (10 caracteres mínimo).
- Botón «Olvidé mi contraseña» en el login; cambio desde Mi perfil sigue disponible.
- No se transmiten contraseñas al administrador ni por correo.

## INSTALACIÓN OBLIGATORIA

1. Subir el sitio completo a GitHub Pages.
2. **Volver a desplegar** `supabase/functions/manage-collaborators/index.ts` en la Edge Function cuyo slug real sea `manage-collaborators`.
3. En Supabase → Authentication → URL Configuration configurar Site URL `https://foroeconomiadelvisitante.com.ar` y agregar a **Redirect URLs** `https://foroeconomiadelvisitante.com.ar/admin/acceso.html` (URL exacta).
4. Verificar que los templates de correo de **Invite user** y **Reset password** conserven `{{ .ConfirmationURL }}`; si ya existen invitaciones enviadas a localhost, generar una invitación nueva o un correo de recuperación.
5. Comprobar flujo: invitación de prueba → URL del dominio → establecer contraseña → acceso al CMS → cambiar contraseña → recuperación por correo.

**Nota:** el proveedor de SMTP de Supabase puede tener límites; configurar SMTP propio para envíos de producción. Ningún SQL nuevo.
