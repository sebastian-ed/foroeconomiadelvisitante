# foroeconomiadelvisitante

Sitio institucional + CMS para el **Foro para el Desarrollo de la Economía del Visitante**.

La arquitectura toma como referencia funcional el proyecto provisto por el usuario, pero fue reconstruida para el Foro: identidad editorial, estructura institucional, contenidos, agenda, blog, consultas, newsletter y un proyecto Supabase nuevo desde cero.

## Qué incluye

### Sitio público

- Inicio institucional con una estética editorial/profesional, sin lenguaje visual de agencia de viajes.
- Secciones: El Foro, Conocimiento, Actividades, Voces y Participá.
- Blog / publicaciones con distintos tipos: artículos, análisis, investigaciones, informes, recursos, entrevistas, podcast, experiencias y casos territoriales.
- Agenda de actividades con detalle e inscripción opcional.
- Buscador por título, categoría, autor y etiquetas.
- Formulario de participación y contacto.
- Suscripción al newsletter y página pública de gestión/baja.
- SEO base, Open Graph, URLs canónicas, `robots.txt`, `sitemap.xml` y soporte opcional para GA4.
- Responsive para escritorio, tablet y móvil.
- La web funciona con contenido local aunque Supabase todavía no esté configurado.

### CMS `/admin/`

- Autenticación con Supabase Auth.
- **Editor visual en vivo** sobre la propia web: edición directa de textos en contexto, con preview Desktop / Tablet / Mobile.
- Constructor de portada: reordenar por drag & drop, editar, duplicar, mostrar/ocultar, eliminar y agregar bloques.
- Edición de páginas institucionales.
- Blog estilo WordPress: crear/editar/eliminar publicaciones, borradores, programación, tipos editoriales, categorías, etiquetas, autoría, extracto, imagen destacada, SEO, fuentes y editor enriquecido.
- Agenda de actividades con publicación, fechas, modalidad, lugar, inscripción, contenido enriquecido y SEO.
- Biblioteca de medios con Supabase Storage.
- Gestión de consultas: estado, notas internas y referencias.
- Newsletter: suscriptores, campañas, editor de contenido y envío mediante Supabase Edge Function + Resend.
- Diseño global: colores, tipografía, ancho, radios y espaciado.
- Navegación editable.
- Revisiones del contenido estructural con restauración.
- Vista previa integrada.
- Editor JSON avanzado para casos no cubiertos por la interfaz visual.

## Archivos principales

- `index.html`: portada.
- `el-foro.html`, `conocimiento.html`, `actividades.html`, `voces.html`, `participa.html`: secciones principales.
- `articulo.html`: detalle de publicación.
- `actividad.html`: detalle de actividad.
- `buscar.html`: buscador.
- `css/site.css`: sistema visual público.
- `js/content.js`: contenido institucional inicial y fallback.
- `js/site.js`: renderer público.
- `js/db.js`: API Supabase del frontend/CMS.
- `admin/`: CMS completo.
- `supabase/schema.sql`: esquema nuevo de base, RLS, Storage y contenidos iniciales.
- `supabase/functions/`: funciones de notificación y newsletter.
- `SUPABASE_SETUP.md`: puesta en marcha.

## Subir a GitHub Pages

1. Crear un repositorio llamado `foroeconomiadelvisitante`.
2. Subir el contenido de esta carpeta a la raíz del repositorio.
3. En GitHub: **Settings → Pages → Deploy from a branch → main / root**.
4. El sitio público ya funciona con contenido inicial. Para habilitar administración y formularios persistentes, completar Supabase siguiendo `SUPABASE_SETUP.md`.
5. Cuando tengas el dominio/URL final, reemplazá `TU-DOMINIO` dentro de `sitemap.xml`.

## Importante sobre Supabase

`js/supabase-config.js` viene deliberadamente sin URL ni anon key. No se reutilizó ninguna credencial del proyecto de referencia.

Nunca pongas la `service_role` en GitHub ni en archivos del navegador. La service role se usa únicamente dentro de Edge Functions, como secreto del proyecto Supabase.

## Email y newsletter

El email de destino está preparado para **foroeconomiadelvisitante@gmail.com**. Para enviar notificaciones y campañas se utiliza un proveedor transaccional; la implementación incluida está preparada para **Resend** mediante secrets de Supabase. Se puede reemplazar por otro proveedor cambiando únicamente las Edge Functions.

## Revisión visual 2.0 — octubre 2026

- Dirección visual editorial institucional basada en criterios de composición y jerarquía de portales de foros internacionales; no reutiliza fotografías ni recursos de terceros.
- Hero editorial renovado y tipografía Inter + Libre Baskerville.
- Isotipo limpio separado del logo completo. El logo completo se mantiene en la cabecera.
- Se eliminó el mensaje «Inicio en CABA» de la portada.
- Se mantienen las herramientas existentes del CMS y el SQL de Supabase, sin incorporar claves externas.
- Si el proyecto ya tiene contenido propio guardado en Supabase, sus textos/configuración prevalecen sobre los datos iniciales. La nueva hoja de estilos y los isotipos se aplican igualmente.
