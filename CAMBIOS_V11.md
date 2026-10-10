# V11 — Mejoras concretas del editor

- Selector modal de medios con previsualización de imágenes, videos y YouTube, sin prompts nativos.
- Buscador visual de medios almacenados en Supabase.
- Enter en títulos o citas crea un párrafo editable; Shift+Enter conserva salto simple.
- Página «El Foro»: ordenación de sus cinco secciones mediante arrastrar y soltar o flechas, y activación/desactivación de visibilidad sin borrar datos.
- Compatibilidad con esquema Supabase anterior. Mantiene las credenciales públicas previamente configuradas.

## Alcance y pendientes

Esta versión NO implementa Gutenberg ni Elementor completos. El diseño de bloques nativos sigue parcialmente fijado por plantillas HTML. Faltan: árbol de nodos persistido como JSON, inspector de layout anidado, drag entre secciones arbitrarias, borradores separados del contenido publicado, patrones sincronizados, historial de operaciones de cada bloque y pruebas E2E con Supabase. Para implementarlos correctamente se requiere migración y sustitución gradual del motor de plantillas; no conviene afirmar que esos controles existen si no se construyeron.
