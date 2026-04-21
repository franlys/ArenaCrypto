import { getLiveMatches, getUpcomingMatches } from '@/lib/pandascore'
import { GamingHubClient } from './GamingHubClient'

export default async function ArenaGamingPage() {
  const [live, upcoming] = await Promise.all([
    getLiveMatches(),
    getUpcomingMatches(),
  ])

  return <GamingHubClient live={live} upcoming={upcoming} />
}
