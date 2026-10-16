# V43 — Firma configurable y sitemap

- Firma pública automática (predeterminada en nuevas publicaciones): toma los nombres de las biografías visibles.
- Firma personalizada independiente: permite escribir cualquier nombre, sin depender de las fichas.
- «Mostrar Escrito por» permite ocultar la firma sin ocultar biografías.
- Nuevo nombre opcional en la primera biografía; fotos y fichas adicionales permanecen independientes.
- Publicaciones antiguas con firma explícita conservan modo personalizado al reabrirse, para evitar cambios involuntarios.
- Generador de sitemap: usa configuración pública de Supabase incluida en la web si no hay secretos de GitHub; errores HTTP más descriptivos. Nunca utiliza service_role.
- El correo de GitHub solo confirma un fallo; para conocer la causa real se requieren los logs de Actions. El cambio reduce una posible causa (secretos ausentes), pero no garantiza solucionar otros fallos (RLS, permisos del repositorio).

## GitHub Actions
En Actions > Actualizar sitemap público > ejecutar, abrir el paso rojo para leer su error.
Si dice 'Permission denied' al hacer git push, Settings > Actions > General > Workflow permissions > Read and write permissions.
Si Supabase devuelve 401/403, revisar permisos públicos de lectura y la clave publicable (no la de servicio).
