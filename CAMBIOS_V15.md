# V15 — Sincronización de edición y formato parcial

- Eliminada la sobrescritura automática del texto de «Quiénes somos» en cada inicio de sesión del CMS.
- Formato parcial dentro de párrafos: negrita, cursiva y subrayado sobre selección; se almacena como HTML acotado y sanitizado dentro de `site.inlineRich`.
- Los saltos de línea de textos simples se visualizan como saltos en la web pública.
- Selección de secciones institucionales con destacado visual; Escape retira el foco de texto y permite utilizar Supr/Backspace para ocultar la sección elegida.
- No se agregan tablas: los valores se guardan en la configuración existente.

**Advertencia:** la selección parcial aplica a párrafos y bloques de texto `div`/`p`, no a títulos donde el estilo sigue siendo global. Se requiere probar el guardado y la recarga en GitHub Pages con Supabase.
