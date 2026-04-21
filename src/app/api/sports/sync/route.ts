/**
 * POST /api/sports/sync
 * Cron Job diario — sincroniza eventos deportivos reales con ArenaCrypto
 *
 * Mañana (8AM): Abre mercados para partidos del día
 * Noche (11PM): Lee resultados → resuelve mercados + paga apostadores
 *
 * Authorization: Bearer <CRON_SECRET>  o  x-cron-secret: <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getScheduledEvents, getEventById } from '@/lib/sportapi'

const acAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

const ENABLED_SPORTS = ['football', 'basketball', 'baseball']

const FEATURED_TOURNAMENT_IDS = new Set([
  7, 679, 8, 23, 35, 34, 242, 132, 64,
])

// Market types per sport
function getMarketTypes(sport: string): string[] {
  if (sport === 'football') return ['match_winner', 'both_teams_score', 'over_under_2_5']
  return ['match_winner'] // basketball, baseball
}

// Compute winner_name based on market_type and event result
function computeWinner(
  marketType: string,
  homeGoals: number,
  awayGoals: number,
  winnerCode: number,
  homeName: string,
  awayName: string
): string | null {
  switch (marketType) {
    case 'match_winner':
      if (winnerCode === 1) return homeName
      if (winnerCode === 2) return awayName
      return 'draw'
    case 'both_teams_score':
      return homeGoals > 0 && awayGoals > 0 ? 'yes' : 'no'
    case 'over_under_2_5':
      return homeGoals + awayGoals > 2.5 ? 'over' : 'under'
    default:
      return null
  }
}

function isAuthorized(req: NextRequest): boolean {
  const xSecret = req.headers.get('x-cron-secret')
  const bearer  = req.headers.get('authorization')?.replace('Bearer ', '')
  const token   = xSecret ?? bearer ?? ''
  return token === process.env.CRON_SECRET || token === process.env.SUPABASE_SERVICE_ROLE_KEY
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db    = acAdmin()
  const today = new Date().toISOString().split('T')[0]
  const mode  = (await req.json().catch(() => ({})))?.mode ?? 'open'

  const results: Record<string, unknown>[] = []

  for (const sport of ENABLED_SPORTS) {
    try {
      if (mode === 'open') {
        const events = await getScheduledEvents(sport, today)
        const featured = events.filter(
          e => FEATURED_TOURNAMENT_IDS.has(e.tournament.id) && e.status.type === 'notstarted'
        )

        let opened = 0
        for (const event of featured) {
          const marketTypes = getMarketTypes(sport)
          for (const marketType of marketTypes) {
            const { error } = await db
              .from('external_bet_markets')
              .upsert({
                external_event_id:   String(event.id),
                external_sport:      sport,
                external_home_team:  event.homeTeam.name,
                external_away_team:  event.awayTeam.name,
                external_tournament: event.tournament.name,
                market_type:         marketType,
                status:              'open',
                starts_at:           new Date(event.startTimestamp * 1000).toISOString(),
              }, { onConflict: 'external_event_id,market_type' })

            if (!error) opened++
          }
        }

        results.push({ sport, mode: 'open', events_found: events.length, markets_opened: opened })

      } else {
        // Group open markets by event_id to fetch each event only once
        const { data: openMarkets } = await db
          .from('external_bet_markets')
          .select('id, external_event_id, external_sport, market_type, external_home_team, external_away_team')
          .eq('status', 'open')
          .eq('external_sport', sport)

        const byEvent: Record<string, typeof openMarkets> = {}
        for (const m of openMarkets ?? []) {
          if (!byEvent[m.external_event_id]) byEvent[m.external_event_id] = []
          byEvent[m.external_event_id]!.push(m)
        }

        let resolved = 0
        for (const [eventId, markets] of Object.entries(byEvent)) {
          const event = await getEventById(Number(eventId))
          if (event.status.type !== 'finished' || event.winnerCode == null) continue

          const homeGoals = event.homeScore?.current ?? 0
          const awayGoals = event.awayScore?.current ?? 0

          for (const market of markets ?? []) {
            const winner = computeWinner(
              market.market_type,
              homeGoals,
              awayGoals,
              event.winnerCode,
              event.homeTeam.name,
              event.awayTeam.name
            )
            if (winner == null) continue

            await db.from('external_bet_markets').update({
              status:      'resolved',
              winner_name: winner,
              home_score:  homeGoals,
              away_score:  awayGoals,
              resolved_at: new Date().toISOString(),
            }).eq('id', market.id)

            await db.rpc('resolve_external_market', {
              p_market_id:   market.id,
              p_winner_name: winner,
            })

            resolved++
          }
        }

        results.push({ sport, mode: 'resolve', markets_resolved: resolved })
      }
    } catch (err: unknown) {
      results.push({ sport, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return NextResponse.json({ ok: true, date: today, mode, results })
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const mode   = req.nextUrl.searchParams.get('mode') ?? 'open'

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fakeReq = new NextRequest(req.url, {
    method:  'POST',
    headers: { 'x-cron-secret': secret!, 'content-type': 'application/json' },
    body:    JSON.stringify({ mode }),
  })

  return POST(fakeReq)
}
