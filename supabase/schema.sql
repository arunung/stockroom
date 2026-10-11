-- =====================================================================
-- Stockroom — Supabase schema (run once in: Dashboard → SQL Editor → New query)
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- =====================================================================

-- ---------- 1. Tables ------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  role        text not null default 'pending'
              check (role in ('pending','viewer','clerk','manager','admin')),
  last_seen   timestamptz,
  created_at  timestamptz not null default now()
);

-- One generic document store: items / locations / docs / voids / settings
create table if not exists public.records (
  col         text not null,
  id          text not null,
  data        jsonb not null default '{}'::jsonb,
  deleted     boolean not null default false,        -- tombstone (enables delta sync)
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid(),
  primary key (col, id),
  constraint records_col_chk check (col in ('items','locations','docs','voids','settings'))
);
create index if not exists records_col_updated_idx on public.records (col, updated_at);

-- ---------- 2. Helpers -----------------------------------------------
-- Role of the calling user. SECURITY DEFINER so policies on profiles can use it without recursion.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'pending');
$$;

-- A brand-new auth user gets a profile with role 'pending' (no data access until an admin approves)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Server-side timestamps / author on every write (client clocks are never trusted)
create or replace function public.records_stamp() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists records_stamp_trg on public.records;
create trigger records_stamp_trg before insert or update on public.records
  for each row execute function public.records_stamp();

-- "Last seen" for the admin page. Any approved user may touch only their own row.
create or replace function public.touch_seen() returns void
language sql security definer set search_path = public as $$
  update public.profiles set last_seen = now() where id = auth.uid();
$$;

-- Guard rails on profiles: only an admin may change role; nobody may remove the last admin
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and public.my_role() <> 'admin' then
      raise exception 'only admin can change roles' using errcode = '42501';
    end if;
    if old.role = 'admin' and new.role <> 'admin'
       and not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
      raise exception 'cannot demote the last admin' using errcode = '42501';
    end if;
  end if;
  if new.id <> old.id then raise exception 'id is immutable'; end if;
  return new;
end $$;
drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------- 3. Row Level Security ------------------------------------
alter table public.profiles enable row level security;
alter table public.records  enable row level security;

-- profiles: approved users see everyone (names for the UI); pending users see only themselves
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_role() in ('viewer','clerk','manager','admin'));
-- only admin updates profiles (role approval); no client inserts/deletes (trigger creates rows)
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- records: read = any approved role
drop policy if exists records_select on public.records;
create policy records_select on public.records for select to authenticated
  using (public.my_role() in ('viewer','clerk','manager','admin'));

-- records: INSERT
--   docs      → clerk+ (ADJ adjustments need manager+); the author field must be the caller
--   items/locations/voids → manager+ ;  settings → admin
drop policy if exists records_insert on public.records;
create policy records_insert on public.records for insert to authenticated
  with check (
    case col
      when 'docs' then
        public.my_role() in ('clerk','manager','admin')
        and (data->>'type') in ('IN','OUT','TRF','ADJ')
        and ((data->>'type') <> 'ADJ' or public.my_role() in ('manager','admin'))
        and coalesce(data->>'by','') = auth.uid()::text
      when 'items'     then public.my_role() in ('manager','admin')
      when 'locations' then public.my_role() in ('manager','admin')
      when 'voids'     then public.my_role() in ('manager','admin') and coalesce(data->>'by','') = auth.uid()::text
      when 'settings'  then public.my_role() = 'admin'
      else false
    end
  );

-- records: UPDATE (includes tombstone "delete")
--   docs are an immutable ledger: only admin may touch an existing row (sample-data cleanup)
drop policy if exists records_update on public.records;
create policy records_update on public.records for update to authenticated
  using (
    case col
      when 'docs'      then public.my_role() = 'admin'
      when 'items'     then public.my_role() in ('manager','admin')
      when 'locations' then public.my_role() in ('manager','admin')
      when 'voids'     then public.my_role() in ('manager','admin')
      when 'settings'  then public.my_role() = 'admin'
      else false
    end
  )
  with check (
    case col
      when 'docs'      then public.my_role() = 'admin'
      when 'items'     then public.my_role() in ('manager','admin')
      when 'locations' then public.my_role() in ('manager','admin')
      when 'voids'     then public.my_role() in ('manager','admin')
      when 'settings'  then public.my_role() = 'admin'
      else false
    end
  );
-- no DELETE policy: rows are never hard-deleted by clients (use tombstones)

-- ---------- 4. Privileges --------------------------------------------
revoke all on public.profiles, public.records from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.records to authenticated;
grant execute on function public.touch_seen() to authenticated;
revoke execute on function public.touch_seen() from anon;
revoke execute on function public.my_role() from anon;

-- ---------- 5. Realtime ----------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;

-- ---------- 6. Product photos (Storage) ------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.my_role() in ('manager','admin'));
drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.my_role() in ('manager','admin'));
-- Public bucket: reading a photo needs only its (random, unguessable) URL.

-- ---------- 7. Make yourself the first admin -------------------------
-- 1) Open the web app and click "สมัครใช้งาน" with your email.
-- 2) Then run this ONE line (replace the email), and reload the app:
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');

-- ---------- 8. Keep-alive endpoint (used by .github/workflows/keepalive.yml) ----------
-- Free projects are paused after ~1 week without activity. A scheduled call to this
-- harmless function (returns the server time only) counts as a real database request.
create or replace function public.ping() returns timestamptz
language sql stable security definer set search_path = public as $$ select now() $$;
grant execute on function public.ping() to anon, authenticated;
