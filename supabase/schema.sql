-- ================================================================
-- foroeconomiadelvisitante — Supabase CMS
-- Ejecutar completo en SQL Editor de un proyecto NUEVO.
-- No contiene URL ni claves de ningún proyecto existente.
-- ================================================================

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- estructura del sitio ----------
create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  slug text not null default 'site',
  payload jsonb not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- ---------- publicaciones / blog ----------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content_html text not null default '',
  type text not null default 'article' check (type in ('article','analysis','research','report','resource','interview','podcast','experience','case')),
  category text,
  tags text[] not null default '{}',
  author_name text,
  author_role text,
  status text not null default 'draft' check (status in ('draft','published','scheduled','archived')),
  published_at timestamptz,
  featured boolean not null default false,
  featured_image text,
  "references" jsonb not null default '[]'::jsonb,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

-- ---------- agenda ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content_html text not null default '',
  event_type text not null default 'meeting' check (event_type in ('conversation','workshop','hackathon','project','meeting')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  mode text,
  registration_enabled boolean not null default false,
  registration_note text,
  featured_image text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  email text not null,
  organization text,
  created_at timestamptz not null default now()
);

-- ---------- consultas / participación ----------
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organization text,
  inquiry_type text not null default 'general',
  subject text not null,
  message text not null,
  reference_url text,
  source text not null default 'website',
  status text not null default 'new' check (status in ('new','in_progress','closed')),
  internal_notes text,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- newsletter ----------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  source text not null default 'website',
  status text not null default 'active' check (status in ('active','unsubscribed','bounced')),
  consent_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preheader text,
  html_content text not null default '',
  status text not null default 'draft' check (status in ('draft','sending','sent','failed')),
  sent_at timestamptz,
  sent_count integer not null default 0,
  error_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  email text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  provider_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(campaign_id,email)
);

-- ---------- biblioteca de medios ----------
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text not null unique,
  url text not null,
  mime_type text,
  size_bytes bigint,
  alt_text text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- ---------- perfiles editoriales (informativo / extensible) ----------
create table if not exists public.cms_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'editor' check (role in ('admin','editor','author')),
  created_at timestamptz not null default now()
);

-- ---------- updated_at triggers ----------
drop trigger if exists trg_site_content_updated on public.site_content;
create trigger trg_site_content_updated before update on public.site_content for each row execute function public.set_updated_at();
drop trigger if exists trg_posts_updated on public.posts;
create trigger trg_posts_updated before update on public.posts for each row execute function public.set_updated_at();
drop trigger if exists trg_events_updated on public.events;
create trigger trg_events_updated before update on public.events for each row execute function public.set_updated_at();
drop trigger if exists trg_inquiries_updated on public.inquiries;
create trigger trg_inquiries_updated before update on public.inquiries for each row execute function public.set_updated_at();
drop trigger if exists trg_subscribers_updated on public.newsletter_subscribers;
create trigger trg_subscribers_updated before update on public.newsletter_subscribers for each row execute function public.set_updated_at();
drop trigger if exists trg_campaigns_updated on public.newsletter_campaigns;
create trigger trg_campaigns_updated before update on public.newsletter_campaigns for each row execute function public.set_updated_at();

-- ---------- newsletter RPC pública segura ----------
create or replace function public.subscribe_to_newsletter(
  p_email text,
  p_name text default '',
  p_source text default 'website'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_email));
begin
  if v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Email inválido';
  end if;
  insert into public.newsletter_subscribers(email,name,source,status,consent_at,unsubscribed_at)
  values(v_email,nullif(trim(p_name),''),coalesce(nullif(trim(p_source),''),'website'),'active',now(),null)
  on conflict(email) do update set
    name = coalesce(excluded.name, public.newsletter_subscribers.name),
    source = excluded.source,
    status = 'active',
    consent_at = now(),
    unsubscribed_at = null
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.subscribe_to_newsletter(text,text,text) from public;
grant execute on function public.subscribe_to_newsletter(text,text,text) to anon, authenticated;

-- Baja pública: exige conocer el email y no expone la base de suscriptores.
create or replace function public.unsubscribe_from_newsletter(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.newsletter_subscribers
  set status='unsubscribed', unsubscribed_at=now()
  where email=lower(trim(p_email)) and status <> 'unsubscribed';
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;
revoke all on function public.unsubscribe_from_newsletter(text) from public;
grant execute on function public.unsubscribe_from_newsletter(text) to anon, authenticated;

-- ---------- RLS ----------
alter table public.site_content enable row level security;
alter table public.content_revisions enable row level security;
alter table public.posts enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.inquiries enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_campaigns enable row level security;
alter table public.newsletter_deliveries enable row level security;
alter table public.media_assets enable row level security;
alter table public.cms_profiles enable row level security;

-- site_content
drop policy if exists "Public read site" on public.site_content;
create policy "Public read site" on public.site_content for select to anon,authenticated using (true);
drop policy if exists "Authenticated manage site" on public.site_content;
create policy "Authenticated manage site" on public.site_content for all to authenticated using (true) with check (true);

-- revisions
drop policy if exists "Authenticated manage revisions" on public.content_revisions;
create policy "Authenticated manage revisions" on public.content_revisions for all to authenticated using (true) with check (true);

-- posts
drop policy if exists "Public read published posts" on public.posts;
create policy "Public read published posts" on public.posts for select to anon,authenticated
using (status in ('published','scheduled') and published_at is not null and published_at <= now());
drop policy if exists "Authenticated manage posts" on public.posts;
create policy "Authenticated manage posts" on public.posts for all to authenticated using (true) with check (true);

-- events
drop policy if exists "Public read published events" on public.events;
create policy "Public read published events" on public.events for select to anon,authenticated using (status='published');
drop policy if exists "Authenticated manage events" on public.events;
create policy "Authenticated manage events" on public.events for all to authenticated using (true) with check (true);

-- registrations
drop policy if exists "Public register published events" on public.event_registrations;
create policy "Public register published events" on public.event_registrations for insert to anon,authenticated
with check (
  char_length(name) between 2 and 160 and
  char_length(email) between 5 and 240 and
  exists(select 1 from public.events e where e.id=event_id and e.status='published' and e.registration_enabled=true)
);
drop policy if exists "Authenticated manage registrations" on public.event_registrations;
create policy "Authenticated manage registrations" on public.event_registrations for all to authenticated using (true) with check (true);

-- inquiries
drop policy if exists "Public submit inquiry" on public.inquiries;
create policy "Public submit inquiry" on public.inquiries for insert to anon,authenticated
with check (
  char_length(name) between 2 and 160 and
  char_length(email) between 5 and 240 and
  char_length(subject) between 2 and 240 and
  char_length(message) between 5 and 6000 and
  status='new'
);
drop policy if exists "Authenticated manage inquiries" on public.inquiries;
create policy "Authenticated manage inquiries" on public.inquiries for all to authenticated using (true) with check (true);

-- newsletter
drop policy if exists "Authenticated manage subscribers" on public.newsletter_subscribers;
create policy "Authenticated manage subscribers" on public.newsletter_subscribers for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated manage campaigns" on public.newsletter_campaigns;
create policy "Authenticated manage campaigns" on public.newsletter_campaigns for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated read deliveries" on public.newsletter_deliveries;
create policy "Authenticated read deliveries" on public.newsletter_deliveries for select to authenticated using (true);

-- media records
drop policy if exists "Public read media records" on public.media_assets;
create policy "Public read media records" on public.media_assets for select to anon,authenticated using (true);
drop policy if exists "Authenticated manage media records" on public.media_assets;
create policy "Authenticated manage media records" on public.media_assets for all to authenticated using (true) with check (true);

-- cms profiles
drop policy if exists "Authenticated read profiles" on public.cms_profiles;
create policy "Authenticated read profiles" on public.cms_profiles for select to authenticated using (true);
drop policy if exists "Users update own profile" on public.cms_profiles;
create policy "Users update own profile" on public.cms_profiles for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- ---------- Storage ----------
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('foro-media','foro-media',true,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Public read foro media" on storage.objects;
create policy "Public read foro media" on storage.objects for select to public using (bucket_id='foro-media');
drop policy if exists "Authenticated upload foro media" on storage.objects;
create policy "Authenticated upload foro media" on storage.objects for insert to authenticated with check (bucket_id='foro-media');
drop policy if exists "Authenticated update foro media" on storage.objects;
create policy "Authenticated update foro media" on storage.objects for update to authenticated using (bucket_id='foro-media') with check (bucket_id='foro-media');
drop policy if exists "Authenticated delete foro media" on storage.objects;
create policy "Authenticated delete foro media" on storage.objects for delete to authenticated using (bucket_id='foro-media');

-- ---------- Índices ----------
create index if not exists posts_status_published_idx on public.posts(status,published_at desc);
create index if not exists posts_type_idx on public.posts(type);
create index if not exists posts_tags_gin_idx on public.posts using gin(tags);
create index if not exists events_status_starts_idx on public.events(status,starts_at);
create index if not exists inquiries_status_created_idx on public.inquiries(status,created_at desc);
create index if not exists subscribers_status_idx on public.newsletter_subscribers(status);
create index if not exists revisions_slug_created_idx on public.content_revisions(slug,created_at desc);
create index if not exists media_created_idx on public.media_assets(created_at desc);

-- ---------- Estado inicial ----------
insert into public.site_content(slug,payload) values('site','{}'::jsonb) on conflict(slug) do nothing;

-- Contenidos iniciales reales derivados del brief institucional.
insert into public.posts(slug,title,excerpt,content_html,type,category,tags,author_name,status,published_at,featured,seo_title,seo_description)
values
(
  'economia-del-visitante-una-mirada-mas-amplia',
  'Economía del visitante: una mirada más amplia sobre el desarrollo territorial',
  'Un marco inicial para observar cómo el movimiento de visitantes impacta en actividades que exceden la oferta turística tradicional.',
  '<p>Hablar de economía del visitante implica ampliar el foco. El desarrollo de un destino no depende exclusivamente de hoteles, atractivos o excursiones. También involucra a la gastronomía, el comercio, la cultura, los eventos, el transporte, la tecnología, los servicios y la calidad del entorno urbano y natural.</p><p>El Foro propone observar esas relaciones como un sistema. Esa mirada permite formular mejores preguntas, conectar información dispersa y construir conversaciones entre actores que muchas veces trabajan sobre un mismo territorio desde agendas diferentes.</p><h2>Una herramienta para decidir mejor</h2><p>El objetivo no es reemplazar el concepto de turismo, sino complementarlo con una perspectiva capaz de reconocer la diversidad de impactos que produce la presencia y el desplazamiento de visitantes. A partir de allí, el desafío es transformar conocimiento en iniciativas concretas y medibles.</p>',
  'article','Marco conceptual',array['economía del visitante','territorio','desarrollo'],
  'Foro para el Desarrollo de la Economía del Visitante','published','2026-10-09T15:00:00Z',true,
  'Economía del visitante: una mirada más amplia',
  'Marco inicial del Foro para comprender la economía del visitante y su relación con el desarrollo territorial.'
),
(
  'conocimiento-encuentro-accion',
  'Conocimiento, encuentro y acción: los tres pilares del Foro',
  'Por qué el Foro organiza su trabajo en tres capas que conectan información, conversación y proyectos.',
  '<p>El Foro organiza su propuesta alrededor de tres pilares complementarios: conocimiento, encuentro y acción.</p><h2>Conocimiento</h2><p>Datos, investigaciones, artículos, informes, tendencias y análisis que permitan entender mejor los fenómenos vinculados con la economía del visitante.</p><h2>Encuentro</h2><p>Conversaciones, entrevistas, mesas de debate, actividades de formación y espacios de vinculación entre actores públicos, privados, académicos y comunitarios.</p><h2>Acción</h2><p>Proyectos colaborativos, hackatones, desafíos territoriales y propuestas que puedan transformarse en experiencias piloto.</p>',
  'article','Institucional',array['foro','conocimiento','colaboración'],
  'Foro para el Desarrollo de la Economía del Visitante','published','2026-10-09T15:05:00Z',false,
  'Conocimiento, encuentro y acción',
  'Los tres pilares de trabajo del Foro para el Desarrollo de la Economía del Visitante.'
),
(
  'convocatoria-abierta-a-aportes',
  'Convocatoria abierta a artículos, investigaciones y desafíos territoriales',
  'El Foro abre un canal para recibir aportes que ayuden a construir una agenda plural y fundamentada.',
  '<p>El Foro está abierto a profesionales, instituciones, empresas, investigadores, organismos públicos y comunidades que quieran aportar conocimiento o acercar un desafío concreto.</p><p>Se pueden proponer artículos, investigaciones, temas para debate, casos territoriales, experiencias empresariales y desafíos que requieran articulación entre actores.</p><p>Las contribuciones deben identificar autoría, fuentes cuando corresponda y distinguir con claridad los datos de las opiniones.</p>',
  'article','Participación',array['convocatoria','participación'],
  'Foro para el Desarrollo de la Economía del Visitante','published','2026-10-09T15:10:00Z',false,
  'Convocatoria abierta a aportes',
  'Canal abierto para enviar artículos, investigaciones, temas y desafíos territoriales al Foro.'
)
on conflict(slug) do nothing;
