# V47 — Subcategorías de Conocimiento y orden de autores

- Enlaces de navegación `conocimiento.html?tipo=<slug>` (por ejemplo `ensayos`) se interpretan como subsecciones editoriales, usando la columna `category` ya existente. Los tipos de publicación (`article`, `analysis`...) siguen intactos para preservar la compatibilidad con Supabase.
- En Conocimiento aparecen filtros dinámicos correspondientes a las subsecciones configuradas en Navegación, además de los filtros existentes.
- En el editor de Publicaciones, el campo «Categoría / subsección» sugiere las subsecciones del menú. Para publicar un ensayo, elegir **Tipo: Artículo** y **Categoría: ensayos**. Luego publicar el artículo y el sitio para reflejar la navegación. Las categorías se guardan en cada artículo, sin migración SQL.
- Las fichas de autor ahora admiten posición ordinal (primera, segunda, tercera...), incluyendo la biografía original. El guardado respeta el orden elegido y al reabrir se recupera por el orden de los bloques.
- Nota: los enlaces externos u otras páginas personalizadas agregados al menú no crean automáticamente nuevos archivos HTML o tablas de base de datos. La sincronización implementada corresponde a subsecciones de Conocimiento.
- No requiere cambios en Edge Functions ni SQL.
