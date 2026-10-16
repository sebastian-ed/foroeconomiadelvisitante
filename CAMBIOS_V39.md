# V39 — Optimización SEO e indexación

Dominio canónico: `https://foroeconomiadelvisitante.com.ar/`.

## Qué cambió
- `robots.txt` permite indexar el sitio público, excluye la administración, la página de pruebas y el buscador, y declara el sitemap.
- `sitemap.xml` contiene páginas públicas con URLs absolutas y sin `TU-DOMINIO`.
- Títulos, descripciones, Open Graph, URL canónica y tarjetas sociales en las páginas principales.
- Datos estructurados `Organization` y `WebSite` en Inicio; `Article` y `Event` en páginas dinámicas cuando hay datos válidos.
- Los artículos y actividades mantienen su parámetro `?slug=` en la URL canónica.
- El buscador y las páginas técnicas no se indexan; las publicaciones inexistentes emiten `noindex` al renderizarse.
- `scripts/generate-sitemap.mjs` añade automáticamente publicaciones y actividades públicas al sitemap mediante Supabase REST.
- `.github/workflows/actualizar-sitemap.yml` ejecuta el generador cada seis horas y permite ejecución manual.

## Activación del sitemap de publicaciones (GitHub)
1. Subí **los contenidos de la carpeta `foroeconomiadelvisitante` a la raíz** del repositorio publicado en GitHub Pages, incluyendo `.github/workflows` y `scripts`. No publiques el ZIP anidado como subcarpeta si tu sitio ya se sirve desde la raíz.
2. En GitHub → repositorio → **Settings → Secrets and variables → Actions**, creá los secretos:
   - `SUPABASE_URL`: URL pública de tu proyecto Supabase.
   - `SUPABASE_ANON_KEY`: clave pública/publishable (nunca service role).
3. En **Settings → Actions → General → Workflow permissions**, permití que GitHub Actions tenga permiso de escritura sobre contenidos del repositorio. Si una regla de protección de rama bloquea los commits automáticos, adaptá la regla o el flujo.
4. En **Actions → Actualizar sitemap público → Run workflow**, ejecutá una vez y comprobá que `sitemap.xml` incorpore URLs con `articulo.html?slug=...` y `actividad.html?slug=...`.
5. En Google Search Console (propiedad de dominio ya verificada), enviá `https://foroeconomiadelvisitante.com.ar/sitemap.xml`. Se enviará una sola vez, mientras el archivo seguirá actualizándose.

## Verificaciones recomendadas
- Abrí `https://foroeconomiadelvisitante.com.ar/robots.txt` y `https://foroeconomiadelvisitante.com.ar/sitemap.xml` en el navegador.
- Confirmá que el dominio redirija `http` a `https`, y preferiblemente `www` a la versión sin `www` mediante Cloudflare (sin bucles).
- En Search Console → Inspección de URL, probá Inicio y al menos un artículo publicado.
- Asegurate de que los artículos sean enlazados desde Conocimiento y tengan títulos originales, imágenes con texto alternativo y descripciones útiles.
- El archivo `articulo.html` se completa con JavaScript a partir de Supabase. Google puede procesar JavaScript, pero no está garantizado que lo haga de forma inmediata ni completa. Para indexación editorial robusta a largo plazo, conviene pasar a una **generación estática/pre-render** de páginas individuales o renderizado en servidor. Esta V39 no cambia la arquitectura ni las rutas de los artículos.
- No es posible garantizar primeras posiciones en resultados de búsqueda. La calidad del contenido, autoridad, enlazado externo, competencia y tiempo de rastreo son factores adicionales.

## Notas técnicas
- Si al ejecutar el generador hay un error de RLS, verificá que los registros publicados puedan consultarse con la clave pública; no abras permisos de escritura ni uses claves privadas en Actions.
- Las URLs de actividades y artículos solo se incluyen si cumplen sus estados y fechas públicas y están disponibles para la clave pública.
- `node scripts/generate-sitemap.mjs` sin credenciales genera solo URLs estáticas. En GitHub Actions se exige configuración para evitar eliminar URLs dinámicas existentes por accidente.
- No se requiere ninguna migración SQL.
