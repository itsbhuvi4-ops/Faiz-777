// Supabase Edge Function: sync-youtube-content
// Deploy: supabase functions deploy sync-youtube-content
// Secrets: supabase secrets set YOUTUBE_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Content-Type': 'application/json' }
const apiKey = Deno.env.get('YOUTUBE_API_KEY')
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

function durationToSeconds(duration = 'PT0S') {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0
}

Deno.serve(async () => {
  if (!apiKey) return new Response(JSON.stringify({ error: 'YouTube API secret is not configured.' }), { status: 500, headers: corsHeaders })
  const { data: settings, error: settingsError } = await supabase.from('youtube_settings').select('*').eq('id', 1).single()
  if (settingsError || !settings?.channel_id) return new Response(JSON.stringify({ error: 'Channel ID is not configured.' }), { status: 400, headers: corsHeaders })

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.search = new URLSearchParams({ key: apiKey, channelId: settings.channel_id, part: 'snippet', type: 'video', order: 'date', maxResults: '40' }).toString()
    const search = await fetch(searchUrl)
    if (!search.ok) throw new Error('YouTube search failed')
    const searchData = await search.json()
    const ids = searchData.items.map((item: any) => item.id.videoId).filter(Boolean)
    if (!ids.length) return new Response(JSON.stringify({ synced: 0 }), { headers: corsHeaders })

    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    videosUrl.search = new URLSearchParams({ key: apiKey, id: ids.join(','), part: 'snippet,contentDetails,statistics,liveStreamingDetails' }).toString()
    const videos = await fetch(videosUrl)
    if (!videos.ok) throw new Error('YouTube video lookup failed')
    const videoData = await videos.json()
    const rows = videoData.items.map((video: any) => {
      const seconds = durationToSeconds(video.contentDetails.duration)
      const isLive = video.snippet.liveBroadcastContent === 'live' || video.snippet.liveBroadcastContent === 'upcoming'
      return {
        video_id: video.id,
        content_type: isLive ? video.snippet.liveBroadcastContent : seconds <= 60 ? 'short' : 'video',
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails?.high?.url ?? video.snippet.thumbnails?.medium?.url,
        published_at: video.snippet.publishedAt,
        views: Number(video.statistics?.viewCount ?? 0),
        duration: video.contentDetails.duration,
        metadata: { live: video.snippet.liveBroadcastContent, scheduledStart: video.liveStreamingDetails?.scheduledStartTime },
        last_synced_at: new Date().toISOString(),
      }
    })
    const { error } = await supabase.from('youtube_cache').upsert(rows, { onConflict: 'video_id' })
    if (error) throw error
    await supabase.from('youtube_settings').update({ sync_status: 'success', last_sync_at: new Date().toISOString() }).eq('id', 1)
    return new Response(JSON.stringify({ synced: rows.length }), { headers: corsHeaders })
  } catch (error) {
    await supabase.from('youtube_settings').update({ sync_status: 'failed' }).eq('id', 1)
    return new Response(JSON.stringify({ error: 'YouTube sync failed. Cached content remains available.' }), { status: 502, headers: corsHeaders })
  }
})
