-- Ejecutar una sola vez en Supabase SQL Editor. Extiende los formatos aceptados.
update storage.buckets set allowed_mime_types = array[
'image/jpeg','image/png','image/webp','image/gif','image/avif',
'video/mp4','video/webm','application/pdf',
'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
'application/vnd.oasis.opendocument.text','application/vnd.oasis.opendocument.spreadsheet',
'text/csv','application/csv',
'font/woff2','font/woff','font/ttf','font/otf',
'application/font-woff','application/x-font-woff','application/x-font-ttf','application/x-font-opentype',
'application/octet-stream'
]::text[] where id='foro-media';
