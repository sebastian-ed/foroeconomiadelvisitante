# V18 — Documentos, mapas y autoría editorial

- Editor de publicaciones, entrevistas, eventos y contenidos enriquecidos: inserción PDF, Word, Excel, PowerPoint, ODT/ODS y CSV mediante biblioteca y subida de archivos.
- PDF integrado en la página con descarga. Archivos Office mediante visor Microsoft Online (requiere URL pública accesible y compatibilidad de Microsoft; si falla, permanece la descarga).
- Mapas integrados por dirección o coordenadas mediante Google Maps y previsualización.
- Autoría textual libre, sin necesidad de crear un usuario en el sistema.
- Previsualización antes de insertar, edición de título/pie de documentos y arrastre de bloques existente.
- Ejecutar `supabase/migration_v18_documents.sql` para autorizar formatos en Storage.
- Límite de Storage: 50 MB por archivo; archivos Office se exponen públicamente cuando se insertan en contenidos públicos. No subir información privada.
- Los mapas usan un servicio de terceros y requieren conexión a Internet.
