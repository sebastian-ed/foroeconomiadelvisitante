# V51 — Publicación de contenido institucional

- En CMS → Páginas se incorpora «Guardar y publicar cambios».
- Los cambios de edición se señalan como pendientes de publicación.
- Tras guardar, se vuelve a consultar Supabase y se verifica que `pages` y `navigation` coincidan antes de confirmar éxito.
- No se modifica ninguna publicación ni se altera el contenido guardado de la base.
- Para comprobar «Quiénes somos»: editar → Guardar y publicar cambios → abrir `el-foro.html#quienes-somos` y actualizar.
- No requiere migración SQL ni despliegue de Edge Functions.
