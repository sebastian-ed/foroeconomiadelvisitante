# V35 — Resumen de artículos con IA

Se añadió el botón público **Resumir nota con IA** debajo de la firma de cada artículo. Al tocarlo genera tres puntos breves y permite ocultarlos. La función toma el texto visible del artículo, no el PDF adjunto ni sus contenidos, y no altera el artículo original. El resumen puede contener errores.

## Instalación (necesaria antes de usar)

1. Publicar los archivos del ZIP en GitHub Pages.
2. Ejecutar `supabase/migration_v35_ai_summary.sql` en el SQL Editor del proyecto actual.
3. Crear el secreto `OPENAI_API_KEY` en Supabase Edge Functions (una API key de OpenAI de tu cuenta y facturación). Nunca agregarla a GitHub o al JS público.
4. Crear `SUMMARY_IP_SALT` con una cadena aleatoria larga (al menos 32 caracteres) en los secretos de Supabase.
5. Desplegar la Edge Function `summarize-article` con la opción **Verify JWT desactivada**, porque los lectores no inician sesión. Por CLI: `supabase functions deploy summarize-article --no-verify-jwt`. La propia función aplica allowlist de origen y límites de consumo; los orígenes deben coincidir con los dominios del sitio. Tener en cuenta que el origen no autentica por sí mismo las solicitudes: el límite de gasto también debe configurarse en OpenAI.
6. Probar un artículo largo en la web real y comprobar que el resumen se genera. Si la función no está desplegada se muestra un error explicativo.

Seguridad: 8 pedidos por visitante por hora y 120 globales por día (configurables en SQL). El IP se transforma mediante SHA-256 con secreto antes de almacenarlo. No se expone la clave privada a usuarios. No hay SQL destructivo.

La solicitud envía hasta 18.000 caracteres del contenido visible a OpenAI. No utilizar para información privada. La respuesta de IA es generada al hacer clic, no se persiste y puede ser inexacta.
