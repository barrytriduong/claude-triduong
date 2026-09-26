-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- It creates the tables, the photo/video bucket, and the security rules:
--   * anyone with the site link can VIEW memories
--   * only accounts listed in the `admins` table (you) can ADD / EDIT / DELETE
--
-- BEFORE RUNNING: create your login first (Authentication → Users → Add user),
-- then replace YOUR_EMAIL_HERE at the very bottom with that email.

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

-- Who may edit. Being signed in is not enough: your user must be listed here.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

alter table public.admins   enable row level security; -- no policies: nobody can read/change it via the API
alter table public.events   enable row level security;
alter table public.settings enable row level security;

drop policy if exists "public read events"   on public.events;
drop policy if exists "parents write events" on public.events;
drop policy if exists "public read settings"   on public.settings;
drop policy if exists "parents write settings" on public.settings;

create policy "public read events"   on public.events   for select using (true);
create policy "parents write events" on public.events   for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public read settings"   on public.settings for select using (true);
create policy "parents write settings" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Storage bucket for photos & videos ----------
insert into storage.buckets (id, name, public)
values ('timeline-media', 'timeline-media', true)
on conflict (id) do nothing;

drop policy if exists "parents list media" on storage.objects;
drop policy if exists "parents upload media" on storage.objects;
drop policy if exists "parents update media" on storage.objects;
drop policy if exists "parents delete media" on storage.objects;

create policy "parents list media" on storage.objects
  for select to authenticated using (bucket_id = 'timeline-media' and public.is_admin());
create policy "parents upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'timeline-media' and public.is_admin());
create policy "parents update media" on storage.objects
  for update to authenticated using (bucket_id = 'timeline-media' and public.is_admin());
create policy "parents delete media" on storage.objects
  for delete to authenticated using (bucket_id = 'timeline-media' and public.is_admin());

-- ---------- Make yourself the admin ----------
insert into public.admins (user_id)
select id from auth.users where email = 'YOUR_EMAIL_HERE'
on conflict do nothing;

-- Should return exactly one row with your email. If it's empty, check the email and run the insert again.
select u.email from public.admins a join auth.users u on u.id = a.user_id;
