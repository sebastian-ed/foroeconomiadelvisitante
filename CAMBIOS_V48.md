# V48 — Subcategorías de navegación sincronizadas

- Conocimiento y Voces cargan filtros personalizados de sus menús de navegación.
- El editor de Publicaciones muestra categorías de ambas secciones en sus sugerencias.
- Actividades admite tipos agregados desde la navegación y los muestra en el formulario de eventos.
- Se conserva la lógica de tipos del esquema existente: una subsección es un filtro por categoría, no un tipo nuevo de publicación.
- No requiere migración SQL. Para añadir una subsección usá rutas `conocimiento.html?tipo=slug`, `voces.html?tipo=slug` o `actividades.html?tipo=slug`.
- Las publicaciones deben tener un tipo correspondiente a la página: Conocimiento (Artículo, Análisis, Investigación, Informe, Recurso) o Voces (Entrevista, Podcast, Experiencia, Caso territorial).
- El sitemap y las páginas restantes no fueron alterados.
