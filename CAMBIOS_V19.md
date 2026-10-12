# V19 · Saltos de línea de extractos

- El extracto escrito en el CMS conserva los saltos de línea y los párrafos tanto en la previsualización del editor como en la página pública.
- También se aplican en tarjetas de publicaciones y actividades.
- No se altera ni convierte el texto guardado en Supabase; se representa con `white-space: pre-wrap` para reflejarlo fielmente y evitar introducir HTML sin sanear.
- No requiere SQL adicional.
