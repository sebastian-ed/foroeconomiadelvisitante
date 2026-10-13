-- V35: límite de uso por visitante y global. Ejecutar una sola vez en Supabase SQL Editor.
create table if not exists public.ai_summary_usage (
  id bigint generated always as identity primary key,
  visitor_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_summary_usage_visitor_time on public.ai_summary_usage(visitor_hash,created_at desc);
create index if not exists ai_summary_usage_time on public.ai_summary_usage(created_at desc);
alter table public.ai_summary_usage enable row level security;
revoke all on public.ai_summary_usage from anon, authenticated;
create or replace function public.check_ai_summary_limit(visitor_hash text)
returns boolean language plpgsql security definer set search_path=public as $$
declare per_ip integer; daily_total integer;
begin
  if visitor_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  perform pg_advisory_xact_lock(9271305);
  select count(*) into per_ip from public.ai_summary_usage where ai_summary_usage.visitor_hash=check_ai_summary_limit.visitor_hash and created_at>now()-interval '1 hour';
  select count(*) into daily_total from public.ai_summary_usage where created_at>now()-interval '1 day';
  if per_ip>=8 or daily_total>=120 then return false; end if;
  insert into public.ai_summary_usage(visitor_hash) values(check_ai_summary_limit.visitor_hash);
  delete from public.ai_summary_usage where created_at<now()-interval '3 days';
  return true;
end $$;
revoke all on function public.check_ai_summary_limit(text) from public, anon, authenticated;
grant execute on function public.check_ai_summary_limit(text) to service_role;
