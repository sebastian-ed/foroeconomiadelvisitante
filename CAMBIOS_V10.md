# V10 — editor de bloques y tipografía

- Bloques individuales seleccionables, arrastrables y duplicables dentro de artículos, entrevistas, actividades y contenido HTML adicional.
- Inserción después del bloque seleccionado, vista inmediata WYSIWYG, controles contextuales de familia tipográfica, tamaño, interlineado, alineación, negrita y cursiva.
- Fix de tipografía global: declaraciones antiguas `!important` en `:root` impedían que variables CSS elegidas por el CMS sobreescribieran valores de diseño. Ahora la asignación dinámica utiliza prioridad `important`.
- No cambia el esquema SQL ni los demás módulos.

## Alcance
Este sistema usa HTML compatible con las publicaciones preexistentes. Las ediciones directas del iframe de la portada siguen funcionando mediante sus campos de texto y el botón de editar sección, no es aún un Gutenberg íntegro con panel lateral sincronizado para todas las secciones del sitio. Probar en GitHub Pages antes de usar en producción.
