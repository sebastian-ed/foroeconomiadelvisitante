# V40 — Autores múltiples opcionales

- Basada en V39, sin cambios en SEO, menús, importación ni publicaciones existentes.
- Se conserva el autor y la biografía principal exactamente con los controles originales.
- En «Biografía del autor» se puede «Agregar autor» y «Quitar autor» con nombre, profesión, biografía y fotografía independientes.
- La firma «Escrito por» incluye todos los nombres registrados en el editor, incluso cuando no se muestra su biografía.
- Cada biografía adicional se puede mostrar u ocultar sin borrar la información. Las fotos son independientes y opcionales.
- Las fichas adicionales se guardan dentro del HTML de la publicación, sin migración SQL. El campo `author_name` de Supabase guarda los nombres separados internamente por ` · ` y los muestra separados por comas.
- Compatibilidad con publicaciones anteriores: si no se agregan autores, el comportamiento sigue siendo el mismo.

## Pruebas recomendadas
1. Abrir una publicación existente con una sola biografía y verificar que no cambie.
2. Agregar dos autores, incluir dos fotos y biografías, guardar, reabrir y comprobar la persistencia.
3. Ocultar una biografía y comprobar que el nombre del autor siga apareciendo en «Escrito por».
4. Eliminar un autor adicional y guardar; comprobar que los restantes sigan presentes.

Validación realizada: comprobación de sintaxis de los JavaScript editados y verificación de integridad del ZIP. Pendiente prueba real conectada a Supabase.
