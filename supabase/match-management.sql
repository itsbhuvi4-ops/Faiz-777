-- Apply after schema.sql (and repair-auth-and-data.sql if it was already used).
-- This adds the admin-controlled room-match workflow and public leaderboard.

alter table public.admin_users add column if not exists username text;
create unique index if not exists admin_users_username_unique on public.admin_users (lower(username));

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

-- IGN is deliberately copied into the public result, so the leaderboard never
-- needs to expose an applicant's contact information.
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

create index if not exists matches_schedule_order on public.matches (scheduled_at asc);
create index if not exists match_results_public_order on public.match_results (points desc, kills desc);

drop trigger if exists matches_touch on public.matches;
create trigger matches_touch before update on public.matches for each row execute function public.touch_updated_at();
drop trigger if exists match_results_touch on public.match_results;
create trigger match_results_touch before update on public.match_results for each row execute function public.touch_updated_at();

alter table public.matches enable row level security;
alter table public.match_registrations enable row level security;
alter table public.match_results enable row level security;

create policy "public scheduled matches" on public.matches for select using (status in ('open', 'conducted'));
create policy "admins manage matches" on public.matches for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins manage match registrations" on public.match_registrations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public leaderboard results" on public.match_results for select using (true);
create policy "admins manage match results" on public.match_results for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Username login remains an alias for a Supabase Auth account; passwords are
-- validated only by Supabase and never stored in the website.
create or replace function public.resolve_admin_login(login_username text)
returns table(email text) language sql security definer set search_path = public, auth as $$
  select u.email::text from public.admin_users a join auth.users u on u.id = a.user_id
  where lower(a.username) = lower(trim(login_username)) and a.active = true limit 1;
$$;
revoke all on function public.resolve_admin_login(text) from public;
grant execute on function public.resolve_admin_login(text) to anon, authenticated;
