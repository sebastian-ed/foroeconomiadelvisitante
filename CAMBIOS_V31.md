# V31 — correcciones editoriales

- Guardado de publicaciones/entrevistas con diagnóstico visible, validación y bloqueo de envíos duplicados.
- Persistencia por `id` para publicaciones existentes; inserción independiente para las nuevas.
- YouTube: admite enlaces normales, cortos, Shorts, directos, embed y YouTube Music; sin epígrafes de relleno.
- Editor: control de columnas 50/50, 65/35, 35/65 y 1 columna en plantillas editoriales.
- Conserva editor visual de artículos y demás funciones V30.

**Nota:** el editor visual de artículos sigue siendo parcialmente estructurado; la edición completa de medios se hace desde Publicaciones.
**Prueba requerida:** publicar entrevista con enlace válido y revisar posibles errores de permisos RLS de Supabase.
