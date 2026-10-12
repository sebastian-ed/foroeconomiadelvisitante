# Versión 20 — Extractos con párrafos fieles

- Tanto la vista previa como el sitio público generan párrafos a partir de los saltos dobles (líneas en blanco) introducidos en el extracto.
- Se conservan los saltos simples dentro de cada párrafo como `<br>`.
- Se escapa el contenido antes de convertir saltos, para evitar insertar HTML inseguro.
- Se aplica a artículos, actividades y tarjetas.
- No requiere migraciones de Supabase.
