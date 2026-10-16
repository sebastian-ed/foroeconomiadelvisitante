# V41 — Firma y biografías independientes

- La firma pública «Escrito por» **no** se rellena ni modifica con los nombres de las biografías adicionales.
- Si la firma queda vacía, el sitio usa el nombre institucional/administrador configurado como antes.
- Las fichas de «Sobre los autores» conservan nombre, cargo, fotografía opcional, visibilidad y biografía propios, sin limitar su número.
- Al crear una publicación nueva, el campo de firma aparece vacío para dejar claro el comportamiento automático.
- Compatibilidad con V40: al abrir una publicación anterior, si la firma fue formada automáticamente concatenando exactamente los nombres de las fichas, se recupera la firma inicial en el formulario; el cambio se persiste al guardar.
- Se mantiene el resto del sitio y del CMS sin modificaciones. Sin cambios SQL.

## Comprobaciones
Control de sintaxis JavaScript y ZIP. El guardado real con Supabase y la publicación online requieren prueba en el entorno del usuario.
