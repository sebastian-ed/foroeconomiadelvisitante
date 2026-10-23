# V52 — Verificación de publicación institucional

- Corrige el falso error de verificación provocado por comparar `JSON.stringify` de objetos JSONB con distinta ordenación de propiedades.
- `saveSiteContent` ahora solicita la fila guardada con `select(...).single()`, lo que comprueba que la operación escribió un registro.
- Compara semánticamente las secciones `pages` y `navigation` de la respuesta de escritura y de la lectura posterior.
- Ante fallos muestra un diagnóstico más preciso sin marcar el contenido como publicado.
- No modifica datos actuales ni agrega SQL; conserva cambios locales hasta que el usuario guarde correctamente.

## Prueba
1. Actualizá el sitio con los archivos de V52.
2. Ingresá al CMS → Páginas y modificá un texto.
3. Pulsá «Guardar y publicar cambios».
4. Confirmá que diga «Cambios publicados y verificados» y revisá la página pública con recarga completa.

Si aparece un error de RLS, revisar la política `site_content` para rol admin sin desactivarla ni usar service_role en el navegador.
