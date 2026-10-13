# Foro CMS V33 — Importación documental y tablas

- Bloques **Tabla** y **Cuadro destacado** en el editor de publicaciones. Tablas con celdas editables y desplazamiento horizontal en móvil.
- **Importación DOCX:** lectura de títulos, párrafos, listas, énfasis y tablas mediante Mammoth (biblioteca del navegador). Se permite previsualizar antes de reemplazar o agregar contenido; se puede corregir manualmente después.
- **Importación PDF:** extracción del texto por página mediante PDF.js. El PDF no ofrece una estructura semántica fiable para recuperar siempre tablas, imágenes, columnas o estilos; la revisión editorial es necesaria.
- Se incluye un **ejemplo importado** del Word «El futuro del profesional del turismo», con dos tablas, apartado por apartado y autoría José Luis López Ibáñez, para probar el flujo sin publicar.
- Se preservan los contenidos guardados en Supabase; no se requieren migraciones SQL.
- Para importar en GitHub Pages se necesitan las bibliotecas JS Mammoth y PDF.js alojadas en CDN. Si están bloqueadas por el navegador o la red, el importador comunica el error sin reemplazar el borrador.
- La estructura importada se adapta a la web y no intenta replicar milimétricamente los saltos de página de Word/PDF.

Prueba recomendada: ingresar a CMS > Publicaciones > Nueva publicación, pulsar «Cargar ejemplo del Word adjunto», revisar las matrices y seleccionar «Crear artículo con este contenido». Guardar como borrador antes de publicar.
