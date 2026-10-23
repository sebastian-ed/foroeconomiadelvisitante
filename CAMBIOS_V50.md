# V50 — Páginas y destinos de publicación

- Los destinos se toman de toda la navegación interna (incluidos submenús); el formato técnico no define dónde se publica.
- Las páginas creadas con «Crear página propia» viven en `pagina.html?slug=...` y se editan en Páginas. Pueden permanecer ocultas del menú.
- El contenido de las páginas y la navegación se guardan mediante «Publicar sitio» en el estado actual de Supabase.
- Los artículos se asignan a una sola URL mediante el campo category, sin migración SQL.
- Los enlaces externos no son destinos de publicación.
- Las páginas previamente existentes siguen intactas.
- Cambiar una URL manualmente después de publicar requiere actualizar el destino de los artículos.
- Las páginas personalizadas son dinámicas (se renderizan con JS); su indexación SEO avanzada requiere prerenderizado.
