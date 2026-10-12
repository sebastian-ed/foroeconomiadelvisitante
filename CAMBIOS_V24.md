# V24 — Medios y editor de páginas

- Corrige una regla CSS con `!important` que ocultaba la imagen destacada de las tarjetas aunque la publicación tuviera `featured_image`.
- Agrega carga directa de imágenes y videos desde la computadora en el inspector de bloques del editor visual; los archivos se suben a Supabase Storage y se asignan al bloque.
- Añade navegación por secciones de las páginas interiores en el editor visual, accesos a su contenido, selección y desplazamiento a cada sección.
- Conserva edición directa de textos y bloques adicionales en páginas interiores.
- No modifica el esquema SQL.

La imagen destacada solo se verá cuando exista una URL válida en `featured_image` de la publicación. Si el recuadro continúa azul, revisar en el CMS la URL y los permisos públicos de Storage.
