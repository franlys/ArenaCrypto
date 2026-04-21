import { getScheduledEvents, getLiveEvents } from '@/lib/sportapi'
import { SportHubClient } from './SportHubClient'

const FEATURED_TOURNAMENT_IDS = new Set([7, 679, 8, 23, 35, 34, 242, 132, 64])
const SPORTS = ['football', 'basketball'] as const

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default async function ArenaSportPage() {
  const today = todayStr()

  const eventsBySport: Record<string, Awaited<ReturnType<typeof getScheduledEvents>>> = {}
  const liveBySport:   Record<string, Awaited<ReturnType<typeof getLiveEvents>>>     = {}

  await Promise.all(
    SPORTS.map(async sport => {
      try {
        const [scheduled, live] = await Promise.all([
          getScheduledEvents(sport, today),
          getLiveEvents(sport),
        ])
        eventsBySport[sport] = scheduled.filter(e => FEATURED_TOURNAMENT_IDS.has(e.tournament.id)).slice(0, 20)
        liveBySport[sport]   = live.filter(e => FEATURED_TOURNAMENT_IDS.has(e.tournament.id)).slice(0, 8)
      } catch {
        eventsBySport[sport] = []
        liveBySport[sport]   = []
      }
    })
  )

  return <SportHubClient eventsBySport={eventsBySport} liveBySport={liveBySport} />
}
