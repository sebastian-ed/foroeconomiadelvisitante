# Versión 5 — CMS audiovisual

- Panel de medios independiente en cada bloque de Portada.
- Imagen, video HTML5 (MP4/WebM) y YouTube, mediante URL o selección desde biblioteca de medios cargados.
- Ajuste cubrir/contener, posición focal, zoom, proporción y póster.
- Autoplay, mute, loop, controles, subtítulos, inicio y fin en segundos.
- Vista visual: botón «Editar sección / medios» sobre todos los bloques del Inicio, además de edición de textos; vista previa de las páginas públicas en el selector.
- Ajustes: logo horizontal, isotipo y nuevo isotipo independiente del pie, con sugerencias de URL de la biblioteca.
- Ajustes de contraste para campos de edición en el modal de secciones.
- Contenido existente compatible; se añaden propiedades `media` opcionales al JSON de cada sección y cada ítem sin alterar la base de datos.
- SQL conserva corrección del campo reservado `"references"`.

## Uso

1. Extraer y subir TODO el contenido a GitHub Pages.
2. En CMS > Medios, subir archivos; en CMS > Portada > lápiz de cualquier sección, elegir medio y configurar.
3. Usar **Aplicar** y después **Publicar sitio**. Aplicar solo modifica el borrador local.
4. En Editor visual, elegir «Inicio» y pulsar «Editar sección / medios» sobre el bloque.
5. En Ajustes, cambiar logo, isotipo e isotipo del footer.

Los videos de YouTube pueden mostrar elementos de marca de su reproductor; el modo limpio los minimiza, no los elimina de forma garantizada. Los navegadores suelen exigir `mute` para autoplay. Para clips con control estricto del inicio y fin, usar MP4/WebM alojado en Storage. Esta versión no ejecuta migraciones de base de datos.
