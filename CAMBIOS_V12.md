# V12 — Motor de bloques estructurados

- Edición inline: Enter inserta saltos visibles, tanto en titulares como en párrafos. Se sincroniza al escribir con el estado del CMS, y no solo al perder el foco.
- Conservación en web publicada mediante `white-space: pre-line` y almacenamiento de `\n` como texto.
- Nuevo constructor dentro de Editor visual, con bloques tipados independientes en JSON: títulos, subtítulos, párrafos, citas, fotos, videos, YouTube y separadores.
- Inspector contextual de propiedades: texto, URL, familia tipográfica, tamaño, interlineado y alineación.
- Reordenamiento por arrastre, duplicación, eliminación y selección.
- Vista previa actualizada con el estado local sin publicar; persistencia al usar Publicar sitio.
- Datos guardados en `sections[].visualBlocks` y `pages[slug].visualBlocks`, usando la columna JSON existente. No requiere SQL.

## Alcance
Esta versión introduce una estructura de bloques persistentes junto al CMS existente. Los bloques heredados de diseño no se convierten automáticamente; se pueden seguir editando con sus herramientas anteriores. No equivale a Gutenberg completo: falta anidamiento libre de columnas, historial de operaciones a nivel bloque y plantillas sincronizadas.
