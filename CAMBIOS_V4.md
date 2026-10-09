# Rediseño V4 — Foro para el Desarrollo de la Economía del Visitante

## Dirección visual
- Sistema editorial cinematográfico oscuro inspirado en Chubut Web, sin trasladar su marca.
- Negro azulado, marfil y acentos de azul del Foro. Instrument Serif y DM Sans.
- Hero panorámico, jerarquía editorial, composición asimétrica, grillas de contenido y divisores sutiles.
- Navbar sin hueco entre activador y submenú, compatible con hover y focus.
- Portada, interiores, artículos, actividades, formularios y footer coordinados.

## CMS
Se conservan los módulos de administración, esquema SQL, Edge Functions, bloques y edición inline. Se cambió el render público del hero conservando sus rutas CMS. El fondo de portada está en `assets/images/hero-territorio.jpg`; puede reemplazarse por una fotografía propia o editarse configurando `heroImage` dentro del bloque hero.

## Despliegue
Subir todo el contenido de este directorio a la raíz del repositorio GitHub Pages. Para envíos, newsletters y administración en producción hace falta configurar Supabase y las Edge Functions como indica SUPABASE_SETUP.md.
