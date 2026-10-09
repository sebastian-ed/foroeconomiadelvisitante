# V9 — Editor de bloques y entrevistas audiovisuales

- Publicaciones y actividades: barra «Agregar bloque» con títulos H2/H3, subtítulos, párrafos, listas, citas, separadores, fotografías, videos propios y YouTube.
- Entrevistas: crear una publicación de tipo «Entrevista» y agregar uno o varios videos en el cuerpo mediante el editor. Para video propio, subir primero desde **Medios**; después insertar su URL o número indicado en la lista. Para YouTube, pegar el enlace.
- Portada: cada sección admite contenido editorial adicional sin perder los campos preexistentes ni sus controles de medios.
- Páginas: El Foro, Participá, Conocimiento, Actividades, Voces y Newsletter incorporan módulos editoriales adicionales desde **Páginas**.
- Conserva los valores en `content_html`, `sections[].extraHtml` y `pages[slug].extraHtml`, dentro de la configuración habitual del CMS; no requiere nuevas tablas SQL.
- La web pública sanea el HTML e impide iframes que no provengan de `youtube-nocookie.com/embed/{id}`.
- Mejora de contraste y controles de bloque.

## Uso

1. Abrir Publicaciones → Nueva publicación → tipo «Entrevista».
2. En «Cuerpo», usar los botones de «Agregar bloque».
3. Para video propio, subir MP4/WebM desde Medios, elegir «Video propio» e indicar la URL o el número del archivo en la lista.
4. Para YouTube, elegir «YouTube» y pegar el enlace.
5. Guardar borrador, comprobar vista previa y publicar cuando corresponda.

Los bloques dentro de un texto enriquecido se ordenan usando cortar/pegar; el drag-and-drop de cada bloque del cuerpo y un constructor universal para todas las páginas no forman parte de esta versión.
