# V23 — Presentación editorial y documentos

- Las tarjetas muestran un resumen breve de hasta 185 caracteres, título, autor y enlace a la publicación completa.
- La imagen destacada se usa en las tarjetas del listado, pero ya no se inserta automáticamente dentro del artículo. Las imágenes del cuerpo se insertan mediante bloques independientes.
- Bajo el título de cada artículo aparece «Escrito por».
- Los documentos muestran un visor amplio y el botón de descarga debajo. Los títulos de archivo generados y descripciones de ejemplo se ocultan en publicaciones antiguas.
- En el editor, al seleccionar un bloque documento se puede añadir o quitar el título y la descripción; las imágenes tienen controles de ancho.
- No requiere nueva migración SQL.
- El servidor que entregue PDFs debe permitir su visualización embebida (sin `X-Frame-Options: DENY` ni `Content-Disposition: attachment` forzoso).
