# Configuración de Supabase — foroeconomiadelvisitante

## 1. Crear el proyecto

En Supabase creá un proyecto nuevo llamado:

`foroeconomiadelvisitante`

No reutilices la base ni las claves del proyecto usado como referencia.

## 2. Crear la base

Abrí **SQL Editor** y ejecutá completo:

`supabase/schema.sql`

El script crea:

- `site_content`
- `content_revisions`
- `posts`
- `events`
- `event_registrations`
- `inquiries`
- `newsletter_subscribers`
- `newsletter_campaigns`
- `newsletter_deliveries`
- `media_assets`
- `cms_profiles`
- bucket público `foro-media`
- políticas RLS
- RPC segura para suscribirse al newsletter
- contenidos editoriales iniciales derivados del brief institucional

## 3. Configurar la URL y anon key

En **Project Settings → API**, copiá:

- Project URL
- anon / publishable key

Pegalas en:

`js/supabase-config.js`

Solo estas claves públicas pueden quedar en el repositorio. **Nunca** uses `service_role` en este archivo.

## 4. Crear usuarios administradores

En **Authentication → Users**, creá los usuarios que van a ingresar en `/admin/`.

En esta versión, el acceso editorial depende de que el usuario exista en Supabase Auth. No conviene crear cuentas para personas que no deban tener acceso al CMS.

## 5. Configurar emails de contacto

Las consultas quedan guardadas en la base aunque no configures email. Para recibir además una notificación en `foroeconomiadelvisitante@gmail.com`, desplegá la Edge Function `contact-notification`.

La implementación incluida utiliza Resend. Necesitás un remitente/dominio verificado en ese proveedor.

Secrets requeridos:

```bash
supabase secrets set RESEND_API_KEY="..."
supabase secrets set RESEND_FROM_EMAIL="Foro Economía del Visitante <notificaciones@tu-dominio.com>"
supabase secrets set CONTACT_TO_EMAIL="foroeconomiadelvisitante@gmail.com"
supabase secrets set PUBLIC_SITE_URL="https://tu-dominio.com"
```

Después:

```bash
supabase functions deploy contact-notification --no-verify-jwt
```

`--no-verify-jwt` es intencional para permitir que el formulario público dispare la notificación. La función no acepta destinatarios arbitrarios: lee una consulta existente y usa el email de destino definido como secret.

## 6. Configurar newsletter

La función `send-newsletter` exige sesión de administrador y utiliza la misma API de Resend.

```bash
supabase functions deploy send-newsletter
```

El panel permite crear borradores y enviar a todos los suscriptores activos. Cada envío queda registrado en `newsletter_deliveries`. La página `newsletter.html` permite tramitar la baja y los correos incluyen el acceso a esa gestión cuando `PUBLIC_SITE_URL` está configurado.

## 7. Probar el CMS

Abrí:

`/admin/`

Ingresá con un usuario de Supabase Auth y verificá:

1. Publicar un cambio en portada.
2. Crear un borrador de artículo.
3. Programarlo o publicarlo.
4. Subir un medio.
5. Enviar una consulta desde `participa.html`.
6. Suscribirte al boletín desde el footer.
7. Crear una campaña de newsletter y enviarla a una base de prueba.

## 8. Google Analytics 4

Desde **CMS → Ajustes → Redes** podés cargar el Measurement ID de GA4, por ejemplo `G-XXXXXXXXXX`. Si queda vacío, la web no carga ningún script de Analytics.

## 9. Recomendaciones de producción

- Usar dominio propio y HTTPS.
- Activar protección de cuenta y contraseñas fuertes para los administradores.
- Configurar SPF, DKIM y DMARC del dominio emisor antes de campañas masivas.
- Revisar la política de privacidad antes del lanzamiento público.
- Hacer un backup/export periódico de `posts`, `events`, `inquiries` y `newsletter_subscribers`.
