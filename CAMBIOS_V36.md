# V36 — Importación de Word y PDF con imágenes

- PDF: recuperación de párrafos por posición y jerarquías tipográficas estimadas; extracción de imágenes raster incrustadas compatibles con PDF.js.
- DOCX: Mammoth mantiene tablas, títulos e imágenes; ahora las imágenes se cargan a Supabase Storage al incorporar el documento.
- Previsualización de los contenidos y medios antes de aplicar al borrador.
- Evita guardar imágenes `data:` temporales en las publicaciones: deben subirse a la biblioteca de Supabase.
- Los diseños de PDF con columnas, imágenes vectoriales, diagramas o tablas sin estructura pueden requerir revisión manual. La vista web busca legibilidad responsive, no duplicar coordenadas de impresión.
- No requiere SQL nuevo si la biblioteca de medios existente permite subir PNG/JPEG.
