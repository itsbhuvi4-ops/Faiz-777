-- FAIZ 777 recruitment backend. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.admin_users add column if not exists active boolean not null default true;
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  application_id text not null unique,
  full_name text not null,
  ign text not null,
  uid text not null unique check (uid ~ '^[0-9]{6,16}$'),
  age smallint not null check (age between 10 and 100),
  state text not null, district text not null, country text not null,
  role text not null check (role in ('Rusher','Sniper','Support','IGL')),
  whatsapp text not null, instagram text not null, reason text not null,
  rules_accepted boolean not null check (rules_accepted),
  status text not null default 'pending' check (status in ('pending','under_review','selected','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  ign text not null, uid text not null unique,
  role text not null check (role in ('Rusher','Sniper','Support','IGL')),
  profile_image text, member_since date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.settings (
  id smallint primary key default 1 check (id=1), recruitment_open boolean not null default true,
  guild_name text not null default 'FAIZ 777', guild_description text, logo_url text,
  guild_rules jsonb, match_rules jsonb, instagram_url text, whatsapp_url text,
  youtube_url text not null default 'https://youtube.com/@faiz777gaming-n8i?si=gZdpJ1OVehVuaKoE',
  updated_at timestamptz not null default now()
);
insert into public.settings(id) values (1) on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_users where user_id = auth.uid() and active) $$;
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();
create trigger members_touch before update on public.members for each row execute function public.touch_updated_at();

-- RPC keeps applicant contact data private and creates the id server-side.
create or replace function public.submit_application(payload jsonb)
returns table(application_id text) language plpgsql security definer set search_path=public as $$
declare generated_id text; next_number integer;
begin
  if not (select recruitment_open from public.settings where id=1) then raise exception 'Recruitment is closed'; end if;
  if exists(select 1 from public.applications where uid=payload->>'uid') then raise exception 'duplicate_uid'; end if;
  select count(*) + 1 into next_number from public.applications where extract(year from created_at)=extract(year from now());
  generated_id := 'FAIZ-' || extract(year from now())::text || '-' || lpad(next_number::text,4,'0');
  insert into public.applications(application_id,full_name,ign,uid,age,state,district,country,role,whatsapp,instagram,reason,rules_accepted)
  values(generated_id, payload->>'full_name', payload->>'ign', payload->>'uid', (payload->>'age')::smallint, payload->>'state', payload->>'district', payload->>'country', payload->>'role', payload->>'whatsapp', payload->>'instagram', payload->>'reason', (payload->>'rules_accepted')::boolean);
  return query select generated_id;
end $$;
create or replace function public.get_application_status(lookup_id text)
returns table(application_id text, ign text, uid text, role text, status text, created_at timestamptz) language sql security definer set search_path=public as $$
  select a.application_id,a.ign,a.uid,a.role,a.status,a.created_at from public.applications a where a.application_id=upper(lookup_id) $$;
grant execute on function public.submit_application(jsonb), public.get_application_status(text) to anon, authenticated;

alter table public.admin_users enable row level security;
alter table public.applications enable row level security;
alter table public.members enable row level security;
alter table public.settings enable row level security;
create policy "admins read own admin record" on public.admin_users for select to authenticated using (user_id=auth.uid());
create policy "public active members" on public.members for select using (active=true);
create policy "admins manage members" on public.members for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public settings" on public.settings for select using (true);
create policy "admins manage settings" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage applications" on public.applications for all to authenticated using (public.is_admin()) with check (public.is_admin());
