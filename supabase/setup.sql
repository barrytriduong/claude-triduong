-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- It creates the tables, the photo/video bucket, and the security rules:
--   * anyone with the site link can VIEW memories
--   * only signed-in users (you) can ADD / EDIT / DELETE

-- ---------- Tables ----------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  title       text not null,
  description text not null default '',
  emoji       text not null default '',
  color       text not null default 'pink',
  media       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.settings (
  id   int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb
);

alter table public.events   enable row level security;
alter table public.settings enable row level security;

drop policy if exists "public read events"   on public.events;
drop policy if exists "parents write events" on public.events;
drop policy if exists "public read settings"   on public.settings;
drop policy if exists "parents write settings" on public.settings;

create policy "public read events"   on public.events   for select using (true);
create policy "parents write events" on public.events   for all to authenticated using (true) with check (true);
create policy "public read settings"   on public.settings for select using (true);
create policy "parents write settings" on public.settings for all to authenticated using (true) with check (true);

-- ---------- Storage bucket for photos & videos ----------
insert into storage.buckets (id, name, public)
values ('timeline-media', 'timeline-media', true)
on conflict (id) do nothing;

drop policy if exists "parents upload media" on storage.objects;
drop policy if exists "parents update media" on storage.objects;
drop policy if exists "parents delete media" on storage.objects;

create policy "parents upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'timeline-media');
create policy "parents update media" on storage.objects
  for update to authenticated using (bucket_id = 'timeline-media');
create policy "parents delete media" on storage.objects
  for delete to authenticated using (bucket_id = 'timeline-media');
