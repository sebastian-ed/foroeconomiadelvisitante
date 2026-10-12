# V22 · Medios e imagen destacada

- Selector de medios con carga local de imágenes y videos (además de documentos).
- La carga guarda el archivo en Supabase Storage y lo añade a la biblioteca antes de insertarlo.
- Selector visual de imagen destacada en publicaciones y actividades, con miniaturas, vista previa, carga y eliminación.
- Disponible tanto en nuevas publicaciones como al editar las ya publicadas.
- No requiere migración SQL, si el bucket permite estos formatos y el usuario tiene permisos de carga.
