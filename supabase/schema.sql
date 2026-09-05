-- ========================================================
-- FAIZ 777 — COMPLETE DATABASE SETUP SCHEMA
-- Copy and run this ENTIRE script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mrvkmideqaeczhfxhobg/sql/new
-- ========================================================

create extension if not exists pgcrypto;

-- 1. Applications Table
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  application_id text not null unique,
  full_name text not null,
  ign text not null,
  uid text not null unique check (uid ~ '^[0-9]{6,16}$'),
  age smallint not null check (age between 10 and 100),
  location text,
  state text,
  district text,
  country text,
  role text not null check (role in ('Rusher','Sniper','Support','IGL')),
  whatsapp text not null,
  instagram text,
  reason text not null,
  rules_accepted boolean not null default true,
  status text not null default 'pending' check (status in ('pending','under_review','selected','rejected')),
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure all columns exist
alter table public.applications add column if not exists location text;
alter table public.applications add column if not exists state text;
alter table public.applications add column if not exists district text;
alter table public.applications add column if not exists country text;
alter table public.applications add column if not exists instagram text;
alter table public.applications add column if not exists rules_accepted boolean not null default true;
alter table public.applications add column if not exists reviewed_at timestamptz;
alter table public.applications add column if not exists reviewed_by text;

-- 2. Official Members Roster Table
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  application_id text,
  ign text not null,
  uid text not null unique,
  role text not null check (role in ('Rusher','Sniper','Support','IGL')),
  profile_image text,
  member_since date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.members add column if not exists application_id text;
alter table public.members add column if not exists active boolean not null default true;

-- 3. Settings Table
create table if not exists public.settings (
  id smallint primary key default 1 check (id=1),
  recruitment_open boolean not null default true,
  recruitment_status text not null default 'open',
  guild_name text not null default 'FAIZ 777',
  guild_description text,
  logo_url text,
  guild_rules jsonb,
  match_rules jsonb,
  instagram_url text,
  whatsapp_url text default 'https://chat.whatsapp.com/',
  youtube_url text not null default 'https://youtube.com/@faiz777gaming-n8i?si=gZdpJ1OVehVuaKoE',
  updated_at timestamptz not null default now()
);
alter table public.settings add column if not exists recruitment_status text not null default 'open';
alter table public.settings add column if not exists whatsapp_url text default 'https://chat.whatsapp.com/';
insert into public.settings(id) values (1) on conflict (id) do nothing;

-- 4. Room Matches & Leaderboard Tables
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'FAIZ 777 Room Match',
  scheduled_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'conducted', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_registrations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (match_id, application_id)
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  ign text not null,
  position smallint check (position > 0),
  kills smallint not null default 0 check (kills >= 0),
  points integer not null default 0 check (points >= 0),
  is_winner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, application_id)
);

-- 5. Admin Users Table
create table if not exists public.admin_users (
  user_id uuid primary key default gen_random_uuid(),
  username text not null default 'Bhuvi',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 6. Helper Functions & Triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ 
begin 
  new.updated_at = now(); 
  return new; 
end $$;

drop trigger if exists applications_touch on public.applications;
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();

drop trigger if exists members_touch on public.members;
create trigger members_touch before update on public.members for each row execute function public.touch_updated_at();

-- 7. RPC: submit_application
create or replace function public.submit_application(payload jsonb)
returns table(application_id text) language plpgsql security definer set search_path=public as $$
declare 
  generated_id text; 
  next_number integer;
  clean_loc text;
begin
  if not (select coalesce(recruitment_open, true) from public.settings where id=1) then 
    raise exception 'Recruitment is currently closed'; 
  end if;

  if exists(select 1 from public.applications where uid=trim(payload->>'uid')) then 
    raise exception 'duplicate_uid'; 
  end if;

  select count(*) + 1 into next_number 
  from public.applications 
  where extract(year from created_at) = extract(year from now());

  generated_id := 'FAIZ-' || extract(year from now())::text || '-' || lpad(next_number::text, 4, '0');

  clean_loc := coalesce(
    payload->>'location',
    concat_ws(', ', nullif(trim(payload->>'district'), ''), nullif(trim(payload->>'state'), ''), nullif(trim(payload->>'country'), ''))
  );

  insert into public.applications (
    application_id, full_name, ign, uid, age, location, state, district, country, role, whatsapp, instagram, reason, rules_accepted, status
  ) values (
    generated_id,
    trim(payload->>'full_name'),
    trim(payload->>'ign'),
    trim(payload->>'uid'),
    coalesce((payload->>'age')::smallint, 18),
    clean_loc,
    trim(payload->>'state'),
    trim(payload->>'district'),
    trim(payload->>'country'),
    payload->>'role',
    trim(payload->>'whatsapp'),
    trim(payload->>'instagram'),
    trim(payload->>'reason'),
    coalesce((payload->>'rules_accepted')::boolean, true),
    'pending'
  );

  return query select generated_id;
end $$;

-- 8. RPC: get_application_status
create or replace function public.get_application_status(lookup_id text)
returns table(
  application_id text, 
  ign text, 
  uid text, 
  role text, 
  status text, 
  created_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text
) language sql security definer set search_path=public as $$
  select 
    a.application_id,
    a.ign,
    a.uid,
    a.role,
    a.status,
    a.created_at,
    a.reviewed_at,
    a.reviewed_by 
  from public.applications a 
  where upper(a.application_id) = upper(trim(lookup_id))
     or a.uid = trim(lookup_id)
  limit 1;
$$;

-- 9. RPC: admin_select_application
create or replace function public.admin_select_application(target_id uuid, reviewer text default 'Bhuvi')
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  app record;
begin
  select * into app from public.applications where id = target_id;
  if not found then
    raise exception 'Application not found';
  end if;

  update public.applications 
  set status = 'selected', 
      reviewed_at = now(), 
      reviewed_by = reviewer 
  where id = target_id;

  insert into public.members (application_id, ign, uid, role, active, member_since)
  values (app.application_id, app.ign, app.uid, app.role, true, current_date)
  on conflict (uid) do update 
  set ign = excluded.ign,
      role = excluded.role,
      application_id = excluded.application_id,
      active = true;

  return jsonb_build_object('success', true, 'status', 'selected', 'application_id', app.application_id);
end $$;

-- 10. RPC: admin_reject_application
create or replace function public.admin_reject_application(target_id uuid, reviewer text default 'Bhuvi')
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  app record;
begin
  select * into app from public.applications where id = target_id;
  if not found then
    raise exception 'Application not found';
  end if;

  update public.applications 
  set status = 'rejected', 
      reviewed_at = now(), 
      reviewed_by = reviewer 
  where id = target_id;

  delete from public.members where uid = app.uid;

  return jsonb_build_object('success', true, 'status', 'rejected', 'application_id', app.application_id);
end $$;

-- 11. RPC: admin_delete_application
create or replace function public.admin_delete_application(target_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  app record;
begin
  select * into app from public.applications where id = target_id;
  if not found then
    raise exception 'Application not found';
  end if;

  delete from public.members where uid = app.uid;
  delete from public.applications where id = target_id;

  return jsonb_build_object('success', true, 'deleted_id', app.application_id);
end $$;

-- 12. Performance Indexes
create index if not exists idx_applications_uid on public.applications(uid);
create index if not exists idx_applications_app_id on public.applications(application_id);
create index if not exists idx_applications_status on public.applications(status);
create index if not exists idx_members_uid on public.members(uid);
create index if not exists idx_members_active on public.members(active);

-- 13. Permissions & Row Level Security (RLS)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

grant execute on function public.submit_application(jsonb) to anon, authenticated, service_role;
grant execute on function public.get_application_status(text) to anon, authenticated, service_role;
grant execute on function public.admin_select_application(uuid, text) to anon, authenticated, service_role;
grant execute on function public.admin_reject_application(uuid, text) to anon, authenticated, service_role;
grant execute on function public.admin_delete_application(uuid) to anon, authenticated, service_role;

alter table public.applications enable row level security;
alter table public.members enable row level security;
alter table public.settings enable row level security;
alter table public.matches enable row level security;
alter table public.match_registrations enable row level security;
alter table public.match_results enable row level security;

-- Drop old policies if any
drop policy if exists "allow all applications" on public.applications;
drop policy if exists "public insert applications" on public.applications;
drop policy if exists "public select applications" on public.applications;
drop policy if exists "allow all members" on public.members;
drop policy if exists "allow all settings" on public.settings;
drop policy if exists "allow all matches" on public.matches;
drop policy if exists "allow all match_registrations" on public.match_registrations;
drop policy if exists "allow all match_results" on public.match_results;

-- Create clean open policies for project web app
create policy "allow all applications" on public.applications for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow all members" on public.members for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow all settings" on public.settings for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow all matches" on public.matches for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow all match_registrations" on public.match_registrations for all to anon, authenticated, service_role using (true) with check (true);
create policy "allow all match_results" on public.match_results for all to anon, authenticated, service_role using (true) with check (true);
