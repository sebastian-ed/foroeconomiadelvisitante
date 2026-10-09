-- Ejecutar una sola vez en Supabase SQL Editor para admitir archivos de tipografía.
-- Conserva los tipos de archivo ya permitidos.
update storage.buckets
set allowed_mime_types = ARRAY[
'image/jpeg','image/png','image/webp','image/gif',
'video/mp4','video/webm','application/pdf',
'font/woff2','font/woff','font/ttf','font/otf',
'application/font-woff','application/x-font-woff',
'application/x-font-ttf','application/x-font-opentype',
'application/octet-stream'
]
where id = 'foro-media';
