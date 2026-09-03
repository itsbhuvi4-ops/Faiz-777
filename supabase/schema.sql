-- FAIZ 777 production schema. Run in Supabase SQL Editor before deploying.
create extension if not exists "uuid-ossp";
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz default now());
create table public.site_settings (id int primary key default 1 check (id=1), creator_name text not null default 'FAIZ 777', subtitle text, description text, youtube_channel_link text, collaboration_email text, updated_at timestamptz default now());
create table public.hero_settings (id int primary key default 1 check (id=1), logo_path text, creator_name text, subtitle text, description text, youtube_link text, active boolean default true, updated_at timestamptz default now());
create table public.announcements (id uuid primary key default uuid_generate_v4(), text text not null, category text default 'update', active boolean default true, pinned boolean default false, display_order int default 0, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.events (id uuid primary key default uuid_generate_v4(), name text not null, event_type text, description text, logo_path text, banner_path text, event_date date, event_time time, prize_pool text, entry_fee text, registration_status text check (registration_status in ('REGISTRATION OPEN','UPCOMING','LIVE','COMPLETED')), registration_link text, rules text, schedule text, youtube_livestream_link text, bracket_info text, results text, published boolean default false, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.profiles (id uuid primary key default uuid_generate_v4(), name text not null, subtitle text, biography text, image_path text, links jsonb default '[]'::jsonb, display_order int default 0, active boolean default true, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.community_links (id uuid primary key default uuid_generate_v4(), platform_name text not null, platform_link text not null, description text, display_order int default 0, active boolean default true);
create table public.youtube_settings (id int primary key default 1 check (id=1), channel_link text, channel_id text, featured_video_id text, sync_status text default 'not configured', last_sync_at timestamptz, enabled boolean default true);
create table public.collaboration_settings (id int primary key default 1 check (id=1), business_email text, title text default 'WORK WITH FAIZ 777', description text, active boolean default true);
alter table public.site_settings enable row level security; alter table public.hero_settings enable row level security; alter table public.announcements enable row level security; alter table public.events enable row level security; alter table public.profiles enable row level security; alter table public.community_links enable row level security; alter table public.youtube_settings enable row level security; alter table public.collaboration_settings enable row level security;
-- Public sees only live, intended content. Admin membership is never client-controlled.
create policy "public hero" on public.hero_settings for select using (active);
create policy "public announcements" on public.announcements for select using (active);
create policy "public events" on public.events for select using (published);
create policy "public profiles" on public.profiles for select using (active);
create policy "public communities" on public.community_links for select using (active);
create policy "public settings" on public.site_settings for select using (true);
create policy "public youtube" on public.youtube_settings for select using (enabled);
create policy "public collaboration" on public.collaboration_settings for select using (active);
-- Apply this policy to every table above for authenticated administrators.
create policy "admins manage site settings" on public.site_settings for all to authenticated using (exists(select 1 from public.admin_users where user_id=auth.uid())) with check (exists(select 1 from public.admin_users where user_id=auth.uid()));
create policy "admins manage hero" on public.hero_settings for all to authenticated using (exists(select 1 from public.admin_users where user_id=auth.uid())) with check (exists(select 1 from public.admin_users where user_id=auth.uid()));
create policy "admins manage announcements" on public.announcements for all to authenticated using (exists(select 1 from public.admin_users where user_id=auth.uid())) with check (exists(select 1 from public.admin_users where user_id=auth.uid()));
create policy "admins manage events" on public.events for all to authenticated using (exists(select 1 from public.admin_users where user_id=auth.uid())) with check (exists(select 1 from public.admin_users where user_id=auth.uid()));
create policy "admins manage profiles" on public.profiles for all to authenticated using (exists(select 1 from public.admin_users where user_id=auth.uid())) with check (exists(select 1 from public.admin_users where user_id=auth.uid()));
create policy "admins manage communities" on public.community_links for all to authenticated using (exists(select 1 from public.admin_users where user_id=auth.uid())) with check (exists(select 1 from public.admin_users where user_id=auth.uid()));
create policy "admins manage youtube" on public.youtube_settings for all to authenticated using (exists(select 1 from public.admin_users where user_id=auth.uid())) with check (exists(select 1 from public.admin_users where user_id=auth.uid()));
create policy "admins manage collaboration" on public.collaboration_settings for all to authenticated using (exists(select 1 from public.admin_users where user_id=auth.uid())) with check (exists(select 1 from public.admin_users where user_id=auth.uid()));
-- In Storage: create public bucket `website-assets`. Add public select policy and admin-only insert/update/delete policies using admin_users.
-- Add tables to supabase_realtime publication for instant public refresh.
