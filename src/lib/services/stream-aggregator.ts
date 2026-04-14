import { createAdminClient } from '../supabase/server'

interface StreamInfo {
  platform: 'twitch' | 'youtube' | 'kick'
  id: string
}

export async function aggregateTournamentAudience(tournamentId: string) {
  const supabase = await createAdminClient()

  // 1. Get all participants with stream info
  const { data: participants, error: pErr } = await supabase
    .from('participants')
    .select('stream_platform, stream_id')
    .eq('tournament_id', tournamentId)
    .not('stream_platform', 'is', null)
    .not('stream_id', 'is', null)

  if (pErr || !participants) return 0

  const streams: StreamInfo[] = participants.map(p => ({
    platform: p.stream_platform as any,
    id: p.stream_id as string
  }))

  // 2. Fetch counts in parallel
  const counts = await Promise.all(streams.map(getViewerCount))
  const total = counts.reduce((sum, c) => sum + c, 0)

  // 3. Update tournament
  await supabase
    .from('tournaments')
    .update({ total_live_viewers: total })
    .eq('id', tournamentId)

  return total
}

async function getViewerCount(stream: StreamInfo): Promise<number> {
  try {
    if (stream.platform === 'twitch') {
      // Mock Twitch implementation (Requires OAuth)
      // return fetchTwitchViewers(stream.id)
      return Math.floor(Math.random() * 100) // Mock
    }
    if (stream.platform === 'youtube') {
      // Mock YouTube implementation (Requires API Key)
      // return fetchYouTubeViewers(stream.id)
      return Math.floor(Math.random() * 50) // Mock
    }
    if (stream.platform === 'kick') {
      // Mock Kick implementation
      return Math.floor(Math.random() * 30) // Mock
    }
  } catch (err) {
    console.error(`Error fetching ${stream.platform} viewers for ${stream.id}:`, err)
  }
  return 0
}

/** 
 * Actual implementation notes:
 * 
 * Twitch: 
 * GET https://api.twitch.tv/helix/streams?user_id=ID
 * Headers: Client-ID, Authorization: Bearer TOKEN
 * 
 * YouTube:
 * GET https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=ID&key=KEY
 * data.items[0].liveStreamingDetails.concurrentViewers
 */
