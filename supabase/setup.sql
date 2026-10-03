-- Run this in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again at any time (e.g. after updating the site) — it never deletes memories.
--
-- Who can do what:
--   * ADMINS (you)        can view, add, edit and delete memories
--   * FAMILY (invited)    can view memories, heart, comment, write letters and wishes, share photos
--   * VIEWERS (site PIN)  can only look — set or turn off the PIN in Tools → Family
--   * everyone else       sees nothing — not the stories, not the photos
--
-- BEFORE RUNNING:
--   1. Create the logins first: Authentication → Users → Add user (tick "Auto confirm").
--   2. Replace YOUR_EMAIL_HERE and FAMILY_EMAIL_HERE at the bottom.
--   3. To use invite links from the Family panel, in Authentication → Sign In / Providers:
--      turn "Allow new users to sign up" ON and turn "Confirm email" OFF.
--      This is safe: a new account only gets access through a valid invite code.
--      (Without invite links, keep "Allow new users to sign up" OFF.)

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

-- ---------- Features added in version 2 ----------

-- Lets the website know this script is up to date. Bump together with SCHEMA_VERSION in js/store-supabase.js.
create or replace function public.schema_version() returns int language sql immutable as $$ select 5 $$;

-- Tags on memories ("firsts", "birthday", or your own).
alter table public.events add column if not exists tags text[] not null default '{}';

-- Height & weight over time.
create table if not exists public.measurements (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  height_cm  numeric(5, 1),
  weight_kg  numeric(5, 2),
  note       text not null default '',
  created_at timestamptz not null default now()
);
alter table public.measurements enable row level security;
drop policy if exists "family read measurements"   on public.measurements;
drop policy if exists "parents write measurements" on public.measurements;
create policy "family read measurements"   on public.measurements for select to authenticated using (public.is_family());
create policy "parents write measurements" on public.measurements for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- Letters to her. Any family member can write one; a letter can stay sealed until a date.
create table if not exists public.letters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '',
  title       text not null default '',
  body        text not null,
  written_on  date not null default current_date,
  unlock_on   date,
  created_at  timestamptz not null default now()
);
alter table public.letters enable row level security;
drop policy if exists "read opened or own letters" on public.letters;
drop policy if exists "family write letters"       on public.letters;
drop policy if exists "edit own letters"           on public.letters;
drop policy if exists "delete own letters"         on public.letters;
create policy "read opened or own letters" on public.letters for select to authenticated using (
  public.is_admin() or user_id = auth.uid() or (public.is_family() and (unlock_on is null or unlock_on <= current_date)));
create policy "family write letters" on public.letters for insert to authenticated
  with check (public.is_family() and user_id = auth.uid());
create policy "edit own letters" on public.letters for update to authenticated
  using ((public.is_family() and user_id = auth.uid()) or public.is_admin())
  with check ((public.is_family() and user_id = auth.uid()) or public.is_admin());
create policy "delete own letters" on public.letters for delete to authenticated
  using ((public.is_family() and user_id = auth.uid()) or public.is_admin());

-- Envelopes of sealed letters: who wrote it and when it opens, never the text.
create or replace function public.sealed_letters()
returns table (id uuid, user_id uuid, author_name text, title text, written_on date, unlock_on date)
language sql stable security definer set search_path = public
as $$
  select l.id, l.user_id, l.author_name, ''::text, l.written_on, l.unlock_on
  from public.letters l
  where public.is_family() and l.unlock_on > current_date
$$;

-- Comments and hearts on memories.
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '',
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
alter table public.comments enable row level security;
drop policy if exists "family read comments"  on public.comments;
drop policy if exists "family add comments"   on public.comments;
drop policy if exists "delete own comments"   on public.comments;
create policy "family read comments" on public.comments for select to authenticated using (public.is_family());
create policy "family add comments"  on public.comments for insert to authenticated with check (public.is_family() and user_id = auth.uid());
create policy "delete own comments"  on public.comments for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create table if not exists public.reactions (
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '',
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.reactions enable row level security;
drop policy if exists "family read hearts"  on public.reactions;
drop policy if exists "family add hearts"   on public.reactions;
drop policy if exists "remove own hearts"   on public.reactions;
create policy "family read hearts" on public.reactions for select to authenticated using (public.is_family());
create policy "family add hearts"  on public.reactions for insert to authenticated with check (public.is_family() and user_id = auth.uid());
create policy "remove own hearts"  on public.reactions for delete to authenticated using (user_id = auth.uid());

-- Admin only: family email addresses for the "Email the family" button.
create or replace function public.family_emails()
returns table (email text)
language sql stable security definer set search_path = public
as $$
  select u.email::text from public.family f join auth.users u on u.id = f.user_id
  where public.is_admin()
$$;
revoke execute on function public.family_emails() from public, anon;
grant execute on function public.family_emails() to authenticated;

-- ---------- Features added in version 3 ----------

-- Drafts (only admins see them) and family submissions waiting for approval.
alter table public.events add column if not exists status text not null default 'published';
alter table public.events add column if not exists submitted_by uuid references auth.users (id) on delete set null;
alter table public.events add column if not exists submitted_name text not null default '';
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check check (status in ('published', 'draft', 'pending'));

drop policy if exists "family read events" on public.events;
drop policy if exists "family submit events" on public.events;
create policy "family read events" on public.events for select to authenticated using (
  public.is_admin() or (public.is_family() and (status = 'published' or (status = 'pending' and submitted_by = auth.uid()))));
create policy "family submit events" on public.events for insert to authenticated
  with check (public.is_family() and status = 'pending' and submitted_by = auth.uid());

-- Family members may upload photos for their submissions (only under submissions/).
drop policy if exists "family upload submissions" on storage.objects;
create policy "family upload submissions" on storage.objects for insert to authenticated
  with check (bucket_id = 'timeline-media' and name like 'submissions/%' and public.is_family());

-- Invite links: the admin creates one, the person opens it and picks their own email & password.
create table if not exists public.invites (
  code       text primary key default encode(extensions.gen_random_bytes(12), 'hex'),
  name       text not null default '',
  role       text not null default 'family' check (role in ('family', 'admin')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_by    uuid references auth.users (id) on delete set null,
  used_at    timestamptz
);
alter table public.invites enable row level security; -- no policies: only the functions below touch it

-- Anyone holding a code may check it (used by the sign-up screen).
create or replace function public.check_invite(invite_code text)
returns table (name text, role text)
language sql stable security definer set search_path = public
as $$ select i.name, i.role from public.invites i
      where i.code = invite_code and i.used_by is null and i.expires_at > now() $$;
grant execute on function public.check_invite(text) to anon, authenticated;

-- When someone signs up with an invite code, give them access. A wrong or used code blocks the sign-up.
-- Sign-ups without a code (e.g. users you add in the dashboard) are allowed but get no access.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  c text := new.raw_user_meta_data ->> 'invite_code';
  inv public.invites;
begin
  if c is null or c = '' then return new; end if;
  select * into inv from public.invites where code = c and used_by is null and expires_at > now() for update;
  if not found then raise exception 'This invite link is invalid, expired or already used.'; end if;
  if inv.role = 'admin' then insert into public.admins (user_id) values (new.id) on conflict do nothing;
  else insert into public.family (user_id) values (new.id) on conflict do nothing; end if;
  update public.invites set used_by = new.id, used_at = now() where code = c;
  return new;
end $$;
drop trigger if exists on_auth_user_created_invite on auth.users;
create trigger on_auth_user_created_invite after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----- Admin-only helpers for the Family panel -----
create or replace function public.require_admin() returns void language plpgsql stable security definer set search_path = public
as $$ begin if not public.is_admin() then raise exception 'Only admins can do this.'; end if; end $$;

create or replace function public.admin_list_members()
returns table (user_id uuid, email text, name text, role text, last_sign_in_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.require_admin();
  return query
    select u.id, u.email::text, coalesce(u.raw_user_meta_data ->> 'name', ''),
           case when a.user_id is not null then 'admin' when f.user_id is not null then 'family' else 'none' end,
           u.last_sign_in_at, u.created_at
    from auth.users u
    left join public.admins a on a.user_id = u.id
    left join public.family f on f.user_id = u.id
    order by u.created_at;
end $$;

create or replace function public.admin_create_invite(invite_name text, invite_role text default 'family')
returns text language plpgsql security definer set search_path = public
as $$
declare c text;
begin
  perform public.require_admin();
  insert into public.invites (name, role) values (coalesce(invite_name, ''), invite_role) returning code into c;
  return c;
end $$;

create or replace function public.admin_list_invites()
returns table (code text, name text, role text, created_at timestamptz, expires_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.require_admin();
  return query select i.code, i.name, i.role, i.created_at, i.expires_at from public.invites i
    where i.used_by is null and i.expires_at > now() order by i.created_at desc;
end $$;

create or replace function public.admin_delete_invite(invite_code text)
returns void language plpgsql security definer set search_path = public
as $$ begin perform public.require_admin(); delete from public.invites where code = invite_code; end $$;

-- Role: 'admin', 'family' or 'none' (no access, account kept).
create or replace function public.admin_set_role(target uuid, new_role text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.require_admin();
  if target = auth.uid() then raise exception 'You cannot change your own role.'; end if;
  delete from public.admins where user_id = target;
  delete from public.family where user_id = target;
  if new_role = 'admin' then insert into public.admins (user_id) values (target);
  elsif new_role = 'family' then insert into public.family (user_id) values (target); end if;
end $$;

create or replace function public.admin_set_password(target uuid, new_password text)
returns void language plpgsql security definer set search_path = public, extensions
as $$
begin
  perform public.require_admin();
  if length(new_password) < 8 then raise exception 'The password must be at least 8 characters.'; end if;
  update auth.users set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')), updated_at = now()
  where id = target;
end $$;

create or replace function public.admin_remove_member(target uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.require_admin();
  if target = auth.uid() then raise exception 'You cannot remove yourself.'; end if;
  delete from auth.users where id = target;
end $$;

-- ---------- Features added in version 4 ----------

-- Who's in a memory, and where it happened.
alter table public.events add column if not exists people text[] not null default '{}';
alter table public.events add column if not exists place jsonb;

-- Helper: family can read, admins can change. Used for the simple tables below.
create or replace function public.family_read_admin_write(tbl text) returns void language plpgsql as $$
begin
  execute format('alter table public.%I enable row level security', tbl);
  execute format('drop policy if exists "family read" on public.%I', tbl);
  execute format('drop policy if exists "admin write" on public.%I', tbl);
  execute format('create policy "family read" on public.%I for select to authenticated using (public.is_family())', tbl);
  execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', tbl);
end $$;

-- 💬 Things she said
create table if not exists public.sayings (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  text text not null,
  note text not null default '',
  audio text,
  created_at timestamptz not null default now()
);
select public.family_read_admin_write('sayings');

-- 👨‍👩‍👧 People in her life
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  relation text not null default '',
  photo text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
select public.family_read_admin_write('people');

-- 📸 Watch her grow (one portrait at a time)
create table if not exists public.portraits (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  path text not null,
  created_at timestamptz not null default now()
);
select public.family_read_admin_write('portraits');

-- 🧸 "All about me" cards
create table if not exists public.about_cards (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
select public.family_read_admin_write('about_cards');

-- ✅ Milestones (built-in ones use a fixed key; your own get a random one)
create table if not exists public.milestones (
  key text primary key,
  date date,
  note text not null default '',
  label text not null default '',
  emoji text not null default '',
  created_at timestamptz not null default now()
);
select public.family_read_admin_write('milestones');

-- 🎂 Birthday wishes: everyone in the family can write one
create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default '',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.wishes enable row level security;
drop policy if exists "family read wishes"  on public.wishes;
drop policy if exists "family add wishes"   on public.wishes;
drop policy if exists "delete own wishes"   on public.wishes;
create policy "family read wishes" on public.wishes for select to authenticated using (public.is_family());
create policy "family add wishes"  on public.wishes for insert to authenticated with check (public.is_family() and user_id = auth.uid());
create policy "delete own wishes"  on public.wishes for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- 🩺 Health record: parents only
create table if not exists public.health (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  kind text not null default 'other',
  title text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);
alter table public.health enable row level security;
drop policy if exists "admins only" on public.health;
create policy "admins only" on public.health for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- The setup helper is only needed while this script runs.
drop function if exists public.family_read_admin_write(text);

-- ---------- Features added in version 5: view-only PIN ----------
-- The admin sets a 4-digit PIN in the Family panel. The site then creates one shared
-- "viewer" login with a long random password. Entering the right PIN hands that login to
-- the browser. Viewers can read everything family can read, but never write anything.
-- Wrong PINs are throttled here in the database (5 wrong tries per 15 minutes for the whole site).

create table if not exists public.viewers (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.viewers enable row level security; -- no policies: only the functions below touch it

create or replace function public.can_view() returns boolean
language sql stable security definer set search_path = public
as $$ select public.is_family() or exists (select 1 from public.viewers where user_id = auth.uid()) $$;

-- Reading: family OR viewers. (Writing rules above stay family/admin only.)
drop policy if exists "family read events" on public.events;
create policy "family read events" on public.events for select to authenticated using (
  public.is_admin() or (public.can_view() and (status = 'published' or (status = 'pending' and submitted_by = auth.uid()))));
drop policy if exists "family read settings" on public.settings;
create policy "family read settings" on public.settings for select to authenticated using (public.can_view());
drop policy if exists "family read media" on storage.objects;
create policy "family read media" on storage.objects
  for select to authenticated using (bucket_id = 'timeline-media' and public.can_view());
drop policy if exists "family read measurements" on public.measurements;
create policy "family read measurements" on public.measurements for select to authenticated using (public.can_view());
drop policy if exists "read opened or own letters" on public.letters;
create policy "read opened or own letters" on public.letters for select to authenticated using (
  public.is_admin() or user_id = auth.uid() or (public.can_view() and (unlock_on is null or unlock_on <= current_date)));
create or replace function public.sealed_letters()
returns table (id uuid, user_id uuid, author_name text, title text, written_on date, unlock_on date)
language sql stable security definer set search_path = public
as $$
  select l.id, l.user_id, l.author_name, ''::text, l.written_on, l.unlock_on
  from public.letters l
  where public.can_view() and l.unlock_on > current_date
$$;
drop policy if exists "family read comments" on public.comments;
create policy "family read comments" on public.comments for select to authenticated using (public.can_view());
drop policy if exists "family read hearts" on public.reactions;
create policy "family read hearts" on public.reactions for select to authenticated using (public.can_view());
drop policy if exists "family read wishes" on public.wishes;
create policy "family read wishes" on public.wishes for select to authenticated using (public.can_view());
do $$
declare tbl text;
begin
  foreach tbl in array array['sayings', 'people', 'portraits', 'about_cards', 'milestones'] loop
    execute format('drop policy if exists "family read" on public.%I', tbl);
    execute format('create policy "family read" on public.%I for select to authenticated using (public.can_view())', tbl);
  end loop;
end $$;

-- Invites may also create the shared viewer login.
alter table public.invites drop constraint if exists invites_role_check;
alter table public.invites add constraint invites_role_check check (role in ('family', 'admin', 'viewer'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  c text := new.raw_user_meta_data ->> 'invite_code';
  inv public.invites;
begin
  if c is null or c = '' then return new; end if;
  select * into inv from public.invites where code = c and used_by is null and expires_at > now() for update;
  if not found then raise exception 'This invite link is invalid, expired or already used.'; end if;
  if inv.role = 'admin' then insert into public.admins (user_id) values (new.id) on conflict do nothing;
  elsif inv.role = 'viewer' then insert into public.viewers (user_id) values (new.id) on conflict do nothing;
  else insert into public.family (user_id) values (new.id) on conflict do nothing; end if;
  update public.invites set used_by = new.id, used_at = now() where code = c;
  return new;
end $$;

-- The shared viewer login isn't a person, so it stays out of the members list.
create or replace function public.admin_list_members()
returns table (user_id uuid, email text, name text, role text, last_sign_in_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.require_admin();
  return query
    select u.id, u.email::text, coalesce(u.raw_user_meta_data ->> 'name', ''),
           case when a.user_id is not null then 'admin' when f.user_id is not null then 'family' else 'none' end,
           u.last_sign_in_at, u.created_at
    from auth.users u
    left join public.admins a on a.user_id = u.id
    left join public.family f on f.user_id = u.id
    where not exists (select 1 from public.viewers v where v.user_id = u.id)
    order by u.created_at;
end $$;

-- The PIN (stored hashed) and the shared viewer login it unlocks. No policies: never readable directly.
create table if not exists public.site_pin (
  id              int primary key default 1 check (id = 1),
  pin_hash        text not null,
  viewer_id       uuid references auth.users (id) on delete set null,
  viewer_email    text not null,
  viewer_password text not null,
  updated_at      timestamptz not null default now()
);
alter table public.site_pin enable row level security;

create table if not exists public.pin_attempts (at timestamptz not null default now());
alter table public.pin_attempts enable row level security;

-- Lets the sign-in screen know whether to show the PIN box.
create or replace function public.pin_enabled() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.site_pin where viewer_id is not null) $$;
grant execute on function public.pin_enabled() to anon, authenticated;

-- Right PIN → the viewer login. Wrong PIN → nothing (and it counts toward the limit).
create or replace function public.pin_login(pin text)
returns table (email text, password text)
language plpgsql volatile security definer set search_path = public, extensions
as $$
declare p public.site_pin;
begin
  delete from public.pin_attempts where at < now() - interval '30 days';
  if (select count(*) from public.pin_attempts where at > now() - interval '15 minutes') >= 5 then
    raise exception 'too many tries';
  end if;
  select * into p from public.site_pin where id = 1 and viewer_id is not null;
  if not found or p.pin_hash <> extensions.crypt(coalesce(pin, ''), p.pin_hash) then
    insert into public.pin_attempts default values;
    return;
  end if;
  return query select p.viewer_email, p.viewer_password;
end $$;
grant execute on function public.pin_login(text) to anon, authenticated;

-- Admin: store a new PIN with a freshly created viewer login. The old viewer login is
-- deleted, so everyone who used the old PIN has to enter the new one.
create or replace function public.admin_set_pin(new_pin text, viewer uuid, email text, password text)
returns void language plpgsql security definer set search_path = public, extensions
as $$
begin
  perform public.require_admin();
  if coalesce(new_pin, '') !~ '^[0-9]{4}$' then raise exception 'The PIN must be 4 digits.'; end if;
  if not exists (select 1 from public.viewers where user_id = viewer) then raise exception 'The viewer login is missing.'; end if;
  delete from auth.users where id in (select viewer_id from public.site_pin where viewer_id is distinct from viewer);
  delete from auth.users where id in (select user_id from public.viewers where user_id <> viewer);
  insert into public.site_pin (id, pin_hash, viewer_id, viewer_email, viewer_password, updated_at)
  values (1, extensions.crypt(new_pin, extensions.gen_salt('bf')), viewer, email, password, now())
  on conflict (id) do update set pin_hash = excluded.pin_hash, viewer_id = excluded.viewer_id,
    viewer_email = excluded.viewer_email, viewer_password = excluded.viewer_password, updated_at = now();
  delete from public.pin_attempts where true;
end $$;

-- Admin: turn the PIN off (everyone who used it is signed out).
create or replace function public.admin_disable_pin()
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.require_admin();
  delete from auth.users where id in (select user_id from public.viewers);
  delete from public.site_pin where true;
  delete from public.pin_attempts where true;
end $$;

-- Admin: is the PIN on, since when, and how many wrong tries lately.
create or replace function public.admin_pin_status()
returns table (enabled boolean, updated_at timestamptz, wrong_tries int)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.require_admin();
  return query select exists (select 1 from public.site_pin where viewer_id is not null),
    (select s.updated_at from public.site_pin s where s.id = 1),
    (select count(*)::int from public.pin_attempts where at > now() - interval '7 days');
end $$;

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
