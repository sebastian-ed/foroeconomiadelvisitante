# V53 — Sincronización real de textos de Páginas

## Problema corregido
En la web pública, `editable()` daba prioridad a `site.inlineRich[path]` si existía. Una edición previa con el Editor visual podía dejar allí una copia del texto que **ocultaba** las posteriores ediciones realizadas en CMS → Páginas, incluso después de guardar las nuevas propiedades `pages` en Supabase.

## Solución
Al modificar un campo desde CMS → Páginas se actualiza `pages[...]` y se invalida **solo** el contenido enriquecido previo del mismo campo (`site.inlineRich[path]`). El resto de los campos y sus formatos no se tocan. De este modo, después de pulsar «Guardar y publicar cambios», la web muestra exactamente el texto de ese campo.

Aplica a Quiénes somos, Comisión, misión, visión, metodología, objetivos, encabezados de El Foro, Participá y demás campos editables en Páginas. No cambia artículos ni el contenido guardado en Supabase de antemano.

## Instalación y comprobación
1. Reemplazar el sitio en GitHub por este ZIP.
2. Abrir CMS → Páginas, **volver a editar el campo cuyo cambio anterior no se reflejaba** (puede ser agregar y quitar un espacio para disparar el evento de edición).
3. Pulsar «Guardar y publicar cambios» y comprobar que la publicación fue confirmada.
4. Recargar la URL pública con Ctrl+Shift+R. Una edición desde el Editor visual posterior volverá a tener prioridad, como debe ser.

No requiere SQL ni Edge Functions.

Validaciones realizadas: sintaxis JavaScript e integridad ZIP. Sin prueba en vivo de Supabase.
