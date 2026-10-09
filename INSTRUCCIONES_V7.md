# V7 · Instalación y seguridad

1. Subí todos los archivos del ZIP a GitHub Pages; conservá la configuración pública de Supabase existente.
2. En Supabase SQL Editor ejecutá **supabase/migration_v7_roles.sql** después de reemplazar `ADMIN_EMAIL_AQUI` por el correo de tu usuario administrativo actual (Supabase Authentication). **No ejecutes nuevamente schema.sql** si ya está instalado.
3. Comprobá que `cms_profiles` tenga el usuario con rol `admin`.
4. Instalá Supabase CLI y ejecutá `supabase functions deploy manage-collaborators` contra el proyecto correcto. La función requiere las variables SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY, disponibles en el entorno de funciones. Opcionales: `RESEND_API_KEY`, `FORO_FROM_EMAIL` y `FORO_ADMIN_REDIRECT`. Nunca publiques service_role en GitHub.
5. En Supabase Authentication → URL Configuration agregá `https://sebastian-ed.github.io/foroeconomiadelvisitante/admin/` como redirect permitido. Configurá correo SMTP o Resend para enviar invitaciones; sin Resend la función devuelve al administrador un enlace privado de invitación.
6. Ingresá al CMS. Desde «Colaboradores» invitá usuarios, asigná roles; los autores pueden escribir y editar sus borradores, los editores pueden publicar artículos y gestionar actividades, y el administrador controla sitio, usuarios y comunicaciones.
7. En Páginas → El Foro o en la edición visual, verificá el texto de «Quiénes somos» y presioná «Publicar sitio»: como Supabase guarda contenido remoto, reemplazar archivos no cambia por sí solo textos ya publicados.

## Limitación de YouTube
Se ocultan controles, botones y anotaciones hasta donde YouTube permite; **YouTube no garantiza que desaparezcan el título y su marca en todos los dispositivos**. Para control visual completo, cargá un MP4/WebM propio en Supabase Storage y usalo en el hero o en otras secciones. La previsualización del editor muestra el reproductor en modo de prueba con controles; la web pública respeta los ajustes.

## Publicaciones
La vista previa en vivo se ejecuta dentro de un iframe aislado sin scripts y nunca publica por sí sola. Guardar artículo es una acción independiente de publicar el sitio.

## Validación
Se verificó sintaxis JS local. No se ejecutó una prueba real contra Supabase, no se envió una invitación real ni se verificaron los encabezados de YouTube en todas las plataformas.
