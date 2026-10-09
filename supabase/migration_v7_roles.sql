-- MIGRACIÓN V7 · EJECUTAR DESPUÉS DE schema.sql
-- IMPORTANTE: antes de ejecutar, configurá el email del administrador existente aquí:
-- 1) Reemplazá ADMIN_EMAIL_AQUI por tu email en Supabase Auth (es una sola línea).
-- 2) Se aplican permisos RLS para que autenticarse NO sea suficiente para administrar.

insert into public.cms_profiles(user_id,display_name,role)
select id,coalesce(raw_user_meta_data->>'full_name',email),'admin'
from auth.users where lower(email)=lower('ADMIN_EMAIL_AQUI')
on conflict(user_id) do update set role='admin';

create or replace function public.foro_role() returns text language sql stable security definer set search_path = public as $$
 select role from public.cms_profiles where user_id=auth.uid() limit 1
$$;
revoke all on function public.foro_role() from public;
grant execute on function public.foro_role() to authenticated;

-- Retirar permisos excesivamente abiertos del SQL original
drop policy if exists "Authenticated manage site" on public.site_content;
drop policy if exists "Authenticated manage revisions" on public.content_revisions;
drop policy if exists "Authenticated manage posts" on public.posts;
drop policy if exists "Authenticated manage events" on public.events;
drop policy if exists "Authenticated manage registrations" on public.event_registrations;
drop policy if exists "Authenticated manage inquiries" on public.inquiries;
drop policy if exists "Authenticated manage subscribers" on public.newsletter_subscribers;
drop policy if exists "Authenticated manage campaigns" on public.newsletter_campaigns;
drop policy if exists "Authenticated read deliveries" on public.newsletter_deliveries;
drop policy if exists "Authenticated manage media records" on public.media_assets;
drop policy if exists "Users update own profile" on public.cms_profiles;

create policy "Only admin manage site" on public.site_content for all to authenticated using (public.foro_role()='admin') with check(public.foro_role()='admin');
create policy "Only admin manage revisions" on public.content_revisions for all to authenticated using (public.foro_role()='admin') with check(public.foro_role()='admin');
create policy "Editors read all posts" on public.posts for select to authenticated using (public.foro_role() in ('admin','editor') or created_by=auth.uid());
create policy "Editors insert posts" on public.posts for insert to authenticated with check (public.foro_role() in ('admin','editor') or (public.foro_role()='author' and created_by=auth.uid() and status='draft'));
create policy "Editors update posts" on public.posts for update to authenticated using (public.foro_role() in ('admin','editor') or (public.foro_role()='author' and created_by=auth.uid() and status='draft')) with check (public.foro_role() in ('admin','editor') or (public.foro_role()='author' and created_by=auth.uid() and status='draft'));
create policy "Editors delete posts" on public.posts for delete to authenticated using(public.foro_role() in ('admin','editor') or (public.foro_role()='author' and created_by=auth.uid() and status='draft'));
create policy "Editors manage events" on public.events for all to authenticated using(public.foro_role() in ('admin','editor')) with check(public.foro_role() in ('admin','editor'));
create policy "Editors manage registrations" on public.event_registrations for all to authenticated using(public.foro_role() in ('admin','editor')) with check(public.foro_role() in ('admin','editor'));
create policy "Admin manage inquiries" on public.inquiries for select to authenticated using(public.foro_role()='admin');
create policy "Admin update inquiries" on public.inquiries for update to authenticated using(public.foro_role()='admin') with check(public.foro_role()='admin');
create policy "Admin manage subscribers" on public.newsletter_subscribers for all to authenticated using(public.foro_role()='admin') with check(public.foro_role()='admin');
create policy "Admin manage campaigns" on public.newsletter_campaigns for all to authenticated using(public.foro_role()='admin') with check(public.foro_role()='admin');
create policy "Admin read deliveries" on public.newsletter_deliveries for select to authenticated using(public.foro_role()='admin');
create policy "Team manage media records" on public.media_assets for all to authenticated using(public.foro_role() in ('admin','editor','author')) with check(public.foro_role() in ('admin','editor','author'));

-- Reglas de Storage también se cierran por rol
drop policy if exists "Authenticated upload foro media" on storage.objects;
drop policy if exists "Authenticated update foro media" on storage.objects;
drop policy if exists "Authenticated delete foro media" on storage.objects;
create policy "Team upload foro media" on storage.objects for insert to authenticated with check(bucket_id='foro-media' and public.foro_role() in ('admin','editor','author'));
create policy "Team update foro media" on storage.objects for update to authenticated using(bucket_id='foro-media' and public.foro_role() in ('admin','editor','author')) with check(bucket_id='foro-media' and public.foro_role() in ('admin','editor','author'));
create policy "Team delete foro media" on storage.objects for delete to authenticated using(bucket_id='foro-media' and public.foro_role() in ('admin','editor'));

-- Solo un administrador puede leer listado de perfiles, cada miembro su perfil.
drop policy if exists "Authenticated read profiles" on public.cms_profiles;
create policy "Admin or self read profiles" on public.cms_profiles for select to authenticated using (user_id=auth.uid() or public.foro_role()='admin');

-- Protección: denegar autoasignación o modificación de roles vía navegador.
revoke insert,update,delete on public.cms_profiles from anon,authenticated;
