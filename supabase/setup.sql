-- Run this in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again at any time (e.g. after updating the site) — it never deletes memories.
--
-- Who can do what:
--   * ADMINS (you)        can view, add, edit and delete memories
--   * FAMILY (invited)    can view memories
--   * everyone else       sees nothing — not the stories, not the photos
--
-- BEFORE RUNNING:
--   1. Create the logins first: Authentication → Users → Add user (tick "Auto confirm").
--   2. Replace YOUR_EMAIL_HERE and FAMILY_EMAIL_HERE at the bottom.
--   3. Make sure Authentication → Sign In / Providers → "Allow new users to sign up" is OFF.

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

-- Who may view (admins can always view too).
create table if not exists public.family (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

create or replace function public.is_family() returns boolean
language sql stable security definer set search_path = public
as $$ select public.is_admin() or exists (select 1 from public.family where user_id = auth.uid()) $$;

-- RLS on with no policies = nobody can read or change these lists through the website.
alter table public.admins   enable row level security;
alter table public.family   enable row level security;
alter table public.events   enable row level security;
alter table public.settings enable row level security;

drop policy if exists "public read events"     on public.events;
drop policy if exists "family read events"     on public.events;
drop policy if exists "parents write events"   on public.events;
drop policy if exists "public read settings"   on public.settings;
drop policy if exists "family read settings"   on public.settings;
drop policy if exists "parents write settings" on public.settings;

create policy "family read events"     on public.events   for select to authenticated using (public.is_family());
create policy "parents write events"   on public.events   for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "family read settings"   on public.settings for select to authenticated using (public.is_family());
create policy "parents write settings" on public.settings for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Private storage bucket for photos & videos ----------
-- Files are only reachable through short-lived signed links handed to signed-in family.
insert into storage.buckets (id, name, public)
values ('timeline-media', 'timeline-media', false)
on conflict (id) do update set public = false;

drop policy if exists "parents list media"   on storage.objects;
drop policy if exists "family read media"    on storage.objects;
drop policy if exists "parents upload media" on storage.objects;
drop policy if exists "parents update media" on storage.objects;
drop policy if exists "parents delete media" on storage.objects;

create policy "family read media" on storage.objects
  for select to authenticated using (bucket_id = 'timeline-media' and public.is_family());
create policy "parents upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'timeline-media' and public.is_admin());
create policy "parents update media" on storage.objects
  for update to authenticated using (bucket_id = 'timeline-media' and public.is_admin());
create policy "parents delete media" on storage.objects
  for delete to authenticated using (bucket_id = 'timeline-media' and public.is_admin());

-- ---------- People ----------
-- You (admin):
insert into public.admins (user_id)
select id from auth.users where email = 'tri2212@gmail.com'
on conflict do nothing;

-- A family member who can view. Copy this block for each new person.
insert into public.family (user_id)
select id from auth.users where email = 'test@mail.com'
on conflict do nothing;

-- Check: lists everyone with access. Every email you added should appear here.
select u.email, 'admin' as role from public.admins a join auth.users u on u.id = a.user_id
union all
select u.email, 'family' from public.family f join auth.users u on u.id = f.user_id;
