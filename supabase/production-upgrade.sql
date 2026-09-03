-- Apply after schema.sql. This completes caching, timestamps, secure Storage and Realtime.
alter table public.events add column if not exists timezone text not null default 'Asia/Kolkata';
alter table public.youtube_settings add column if not exists updated_at timestamptz default now();
create table if not exists public.youtube_cache (
  video_id text primary key, content_type text not null check (content_type in ('video','short','live','upcoming')),
  title text not null, thumbnail text, published_at timestamptz, views bigint, duration text,
  metadata jsonb default '{}'::jsonb, last_synced_at timestamptz default now()
);
alter table public.youtube_cache enable row level security;
create policy "public youtube cache" on public.youtube_cache for select using (true);
create policy "admins manage youtube cache" on public.youtube_cache for all to authenticated
  using (exists(select 1 from public.admin_users where user_id=auth.uid()))
  with check (exists(select 1 from public.admin_users where user_id=auth.uid()));

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger announcements_touch before update on public.announcements for each row execute function public.touch_updated_at();

-- In the Storage dashboard create a PUBLIC bucket named website-assets, then apply:
create policy "public website asset read" on storage.objects for select using (bucket_id = 'website-assets');
create policy "admin website asset write" on storage.objects for insert to authenticated with check (bucket_id = 'website-assets' and exists(select 1 from public.admin_users where user_id=auth.uid()));
create policy "admin website asset update" on storage.objects for update to authenticated using (bucket_id = 'website-assets' and exists(select 1 from public.admin_users where user_id=auth.uid()));
create policy "admin website asset delete" on storage.objects for delete to authenticated using (bucket_id = 'website-assets' and exists(select 1 from public.admin_users where user_id=auth.uid()));

alter publication supabase_realtime add table public.hero_settings, public.announcements, public.events, public.profiles, public.community_links, public.collaboration_settings;
