# Server-side YouTube synchronization

Deploy `sync-youtube-content` as a Supabase Edge Function. Set `YOUTUBE_API_KEY` only with Supabase secrets; never add it to the Vite `.env` file or frontend bundle.

Configure a Supabase Cron job to invoke this function every 10–15 minutes. The function uses `youtube_settings.channel_id`, upserts the current channel content into `youtube_cache`, and leaves the public website reading the cache during API outages.
