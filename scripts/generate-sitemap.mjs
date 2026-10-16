/** Build XML sitemap. Optionally include public posts and events from Supabase REST. */
import {writeFileSync} from 'node:fs';
const BASE='https://foroeconomiadelvisitante.com.ar';
const staticPaths=['/','/el-foro.html','/conocimiento.html','/biblioteca-recursos.html','/actividades.html','/voces.html','/participa.html','/newsletter.html'];
const urls=new Map(staticPaths.map(p=>[BASE+p,null]));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const host=process.env.SUPABASE_URL;
const anon=process.env.SUPABASE_ANON_KEY;
async function fetchCollection(table,columns,dateColumn,path){
 if(!host||!anon){console.log(`Skipping dynamic ${table}: SUPABASE_URL / SUPABASE_ANON_KEY missing`);return}
 let offset=0, limit=500, total=0;
 do{
  let url=new URL(`/rest/v1/${table}`,host);
  url.searchParams.set('select',columns.join(','));
  url.searchParams.set('status',table==='events'?'eq.published':'in.(published,scheduled)');
  if(table==='posts')url.searchParams.set('published_at',`lte.${new Date().toISOString()}`);
  url.searchParams.set('order','created_at.asc');
  url.searchParams.set('limit',String(limit));url.searchParams.set('offset',String(offset));
  const res=await fetch(url,{headers:{apikey:anon,Authorization:`Bearer ${anon}`}});
  if(!res.ok)throw new Error(`Supabase ${table}: HTTP ${res.status}: ${(await res.text()).slice(0,300)}`);
  const rows=await res.json();
  for(const item of rows){if(!item.slug)continue;const u=new URL(path,BASE);u.searchParams.set('slug',item.slug);const last=item.updated_at||item[dateColumn]||null;urls.set(u.href,last)}
  total+=rows.length; offset+=limit;
  if(rows.length<limit)break;
 }while(offset<10000);
 console.log(`${table}: ${total} records`);
}
try{
 await fetchCollection('posts',['slug','published_at','updated_at','created_at','status'],'published_at','/articulo.html');
 await fetchCollection('events',['slug','starts_at','updated_at','created_at','status'],'starts_at','/actividad.html');
}catch(error){console.error(error);process.exit(1)}
const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+[...urls].map(([url,last])=>`  <url><loc>${esc(url)}</loc>${last&&!isNaN(Date.parse(last))?`<lastmod>${new Date(last).toISOString().slice(0,10)}</lastmod>`:''}</url>`).join('\n')+'\n</urlset>\n';
writeFileSync(new URL('../sitemap.xml',import.meta.url),xml);
console.log(`Wrote ${urls.size} URLs to sitemap.xml`);
