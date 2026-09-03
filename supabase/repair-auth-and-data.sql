-- Run after schema.sql and production-upgrade.sql. Safe for the existing project.
alter table public.admin_users add column if not exists id uuid default gen_random_uuid();
alter table public.admin_users add column if not exists username text;
alter table public.admin_users add column if not exists display_name text;
alter table public.admin_users add column if not exists role text not null default 'admin';
alter table public.admin_users add column if not exists active boolean not null default true;
alter table public.admin_users add column if not exists updated_at timestamptz not null default now();
create unique index if not exists admin_users_username_unique on public.admin_users (lower(username));
alter table public.admin_users enable row level security;
create policy "admin reads own authorization" on public.admin_users for select to authenticated using (user_id = auth.uid() and active);

-- Public login UI resolves a username only to an already-authorized active account.
-- It never sees a password; password validation remains in Supabase Auth.
create or replace function public.resolve_admin_login(login_username text)
returns table(email text) language sql security definer set search_path = public, auth as $$
  select u.email::text from public.admin_users a join auth.users u on u.id = a.user_id
  where lower(a.username) = lower(trim(login_username)) and a.active = true limit 1;
$$;
revoke all on function public.resolve_admin_login(text) from public;
grant execute on function public.resolve_admin_login(text) to anon, authenticated;

-- Keep data access fast and consistent with public filters.
create index if not exists announcements_public_order on public.announcements (active, display_order);
create index if not exists events_public_date on public.events (published, event_date);
create index if not exists profiles_public_order on public.profiles (active, display_order);
create index if not exists community_public_order on public.community_links (active, display_order);
create index if not exists youtube_cache_published on public.youtube_cache (published_at desc);
