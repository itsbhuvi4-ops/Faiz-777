-- FAIZ 777 Recruitment & Member Sync Schema
-- Run this in your Supabase Project SQL Editor (https://app.supabase.com)

create extension if not exists pgcrypto;

-- 1. Admin Users
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Bhuvi',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.admin_users add column if not exists username text not null default 'Bhuvi';
alter table public.admin_users add column if not exists active boolean not null default true;

-- 2. Applications Table
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

-- Ensure columns exist if table was already created previously
alter table public.applications add column if not exists location text;
alter table public.applications add column if not exists state text;
alter table public.applications add column if not exists district text;
alter table public.applications add column if not exists country text;
alter table public.applications add column if not exists instagram text;
alter table public.applications add column if not exists rules_accepted boolean not null default true;
alter table public.applications add column if not exists reviewed_at timestamptz;
alter table public.applications add column if not exists reviewed_by text;

-- 3. Official Members / Guild Roster
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

-- 4. Settings Table
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

-- 5. Helper Functions & Triggers
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ 
  select exists(select 1 from public.admin_users where user_id = auth.uid() and active) 
  or (auth.jwt() ->> 'email' = 'faiz777admin@gmail.com')
$$;

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

-- 6. RPC: submit_application
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

-- 7. RPC: get_application_status (Non-sensitive public status lookup by Application ID or UID)
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

-- 8. RPC: admin_select_application (Server-side selection & roster sync)
create or replace function public.admin_select_application(target_id uuid, reviewer text default 'Bhuvi')
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  app record;
begin
  select * into app from public.applications where id = target_id;
  if not found then
    raise exception 'Application not found';
  end if;

  -- 1. Update application status
  update public.applications 
  set status = 'selected', 
      reviewed_at = now(), 
      reviewed_by = reviewer 
  where id = target_id;

  -- 2. Upsert into official members roster
  insert into public.members (application_id, ign, uid, role, active, member_since)
  values (app.application_id, app.ign, app.uid, app.role, true, current_date)
  on conflict (uid) do update 
  set ign = excluded.ign,
      role = excluded.role,
      application_id = excluded.application_id,
      active = true;

  return jsonb_build_object('success', true, 'status', 'selected', 'application_id', app.application_id);
end $$;

-- 9. RPC: admin_reject_application
create or replace function public.admin_reject_application(target_id uuid, reviewer text default 'Bhuvi')
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  app record;
begin
  select * into app from public.applications where id = target_id;
  if not found then
    raise exception 'Application not found';
  end if;

  -- 1. Update status
  update public.applications 
  set status = 'rejected', 
      reviewed_at = now(), 
      reviewed_by = reviewer 
  where id = target_id;

  -- 2. Remove from active roster if previously selected
  delete from public.members where uid = app.uid;

  return jsonb_build_object('success', true, 'status', 'rejected', 'application_id', app.application_id);
end $$;

-- 10. RPC: admin_delete_application
create or replace function public.admin_delete_application(target_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  app record;
begin
  select * into app from public.applications where id = target_id;
  if not found then
    raise exception 'Application not found';
  end if;

  -- 1. Remove from members
  delete from public.members where uid = app.uid;

  -- 2. Delete application (releases the UID for new submissions)
  delete from public.applications where id = target_id;

  return jsonb_build_object('success', true, 'deleted_id', app.application_id);
end $$;

grant execute on function public.submit_application(jsonb) to anon, authenticated;
grant execute on function public.get_application_status(text) to anon, authenticated;
grant execute on function public.admin_select_application(uuid, text) to anon, authenticated;
grant execute on function public.admin_reject_application(uuid, text) to anon, authenticated;
grant execute on function public.admin_delete_application(uuid) to anon, authenticated;

-- 11. Row Level Security (RLS)
alter table public.admin_users enable row level security;
alter table public.applications enable row level security;
alter table public.members enable row level security;
alter table public.settings enable row level security;

-- Policies for applications
drop policy if exists "public insert applications" on public.applications;
create policy "public insert applications" on public.applications for insert to anon, authenticated with check (true);

drop policy if exists "public select non sensitive applications" on public.applications;
create policy "public select non sensitive applications" on public.applications for select using (true);

drop policy if exists "admin full access applications" on public.applications;
create policy "admin full access applications" on public.applications for all using (true) with check (true);

-- Policies for members
drop policy if exists "public active members" on public.members;
create policy "public active members" on public.members for select using (active = true);

drop policy if exists "admin manage members" on public.members;
create policy "admin manage members" on public.members for all using (true) with check (true);

-- Policies for settings
drop policy if exists "public settings" on public.settings;
create policy "public settings" on public.settings for select using (true);

drop policy if exists "admin manage settings" on public.settings;
create policy "admin manage settings" on public.settings for all using (true) with check (true);
