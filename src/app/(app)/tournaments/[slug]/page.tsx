import { tournamentDb } from '@/lib/supabase/tournament-db'
import { createClient } from '@/lib/supabase/server'
import { createClient as ptClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AdvancedBettingTabs } from './AdvancedBettingTabs'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export default async function TournamentDetailPage({ params }: Props) {
  // PT client is synchronous — create it upfront
  const pt = ptClient(
    process.env.NEXT_PUBLIC_PT_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_PT_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  // Phase 1: tournament + AC supabase client in parallel (completely independent)
  const [{ data: tournament, error: tErr }, supabase] = await Promise.all([
    tournamentDb.from('tournaments').select('*').eq('slug', params.slug).single(),
    createClient(),
  ])

  if (tErr || !tournament) return notFound()

  // Phase 2: everything that depends on tournament.id — all in parallel
  const [
    { data: teams },
    { data: participants },
    { data: betMarkets },
    { data: liveMatches },
    { data: { user } },
  ] = await Promise.all([
    tournamentDb
      .from('teams')
      .select('*, participants(*)')
      .eq('tournament_id', tournament.id),
    tournamentDb
      .from('participants')
      .select('id, display_name, team_id')
      .eq('tournament_id', tournament.id),
    supabase
      .from('bet_markets')
      .select('id, market_type, round_number, pt_match_id, status, total_volume, kronix_volume')
      .eq('pt_tournament_id', tournament.id)
      .order('opened_at'),
    pt
      .from('matches')
      .select('id, match_number')
      .eq('tournament_id', tournament.id)
      .eq('is_active', true)
      .eq('is_completed', false)
      .eq('is_warmup', false),
    supabase.auth.getUser(),
  ])

  const liveMatchIds = (liveMatches ?? []).map((m: any) => m.id as string)

  // Phase 3: user-specific queries — all in parallel (only if logged in)
  let profile: any = null
  let isUnlocked = false
  let userBets: {
    id: string
    market_id: string
    pt_team_id: string | null
    pt_target_id: string | null
    pt_target_name: string | null
    amount: number
    status: string
    resolved_at: string | null
    created_at: string
    bet_markets: {
      market_type: string
      round_number: number | null
      pt_match_id: string | null
      status: string
      result_pt_team_id: string | null
      result_pt_player_id: string | null
      resolved_at: string | null
    } | null
  }[] = []

  if (user) {
    const [profileResult, unlockResult, betsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, is_premium, is_test_user, wallets(balance_stablecoin, test_balance)')
        .eq('id', user.id)
        .single(),
      supabase
        .from('tournament_unlocks')
        .select('id')
        .eq('user_id', user.id)
        .eq('pt_tournament_id', tournament.id)
        .maybeSingle(),
      supabase
        .from('tournament_bets')
        .select(`
          id, market_id, pt_team_id, pt_target_id, pt_target_name, amount, status, resolved_at, created_at,
          bet_markets!market_id(market_type, round_number, pt_match_id, status, result_pt_team_id, result_pt_player_id, resolved_at)
        `)
        .eq('user_id', user.id)
        .eq('pt_tournament_id', tournament.id)
        .order('created_at', { ascending: false }),
    ])

    profile = profileResult.data

    // Test users bypass the exclusivity gate entirely
    if (profile?.is_premium || profile?.is_test_user) {
      isUnlocked = true
    } else {
      isUnlocked = !!unlockResult.data
    }

    // Supabase returns joined rows as arrays — normalise bet_markets to single object
    userBets = (betsResult.data ?? [])
      .filter((b: any) => b.market_id)
      .map((b: any) => ({
        ...b,
        bet_markets: Array.isArray(b.bet_markets) ? (b.bet_markets[0] ?? null) : (b.bet_markets ?? null),
      }))
  }

  return (
    <main style={{ minHeight: '100vh', background: 'hsl(var(--bg-primary))', color: 'hsl(var(--text-primary))' }}>
      <div style={{ position: 'relative', height: '40vh', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, hsl(var(--bg-primary)), transparent)', zIndex: 1 }} />
        {tournament.logo_url ? (
          <img src={tournament.logo_url} alt={tournament.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15, filter: 'blur(20px)', transform: 'scale(1.1)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(0,245,255,0.05), rgba(139,92,246,0.05))' }} />
        )}

        <div style={{ position: 'absolute', bottom: '3rem', left: '2rem', right: '2rem', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link href="/tournaments" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--text-muted))', textDecoration: 'none', fontSize: '0.7rem', letterSpacing: '0.1em', fontFamily: 'Orbitron, sans-serif', marginBottom: '1rem' }}>
              ← VOLVER AL LOBBY
            </Link>
            <h1 className="font-orbitron" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {tournament.name}
            </h1>
          </div>
          <a
            href={`https://proyecto-torneo-flcf.vercel.app/t/${params.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ fontSize: '0.65rem', letterSpacing: '0.12em' }}
          >
            ESTADÍSTICAS PT ↗
          </a>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <AdvancedBettingTabs
          tournament={tournament}
          teams={teams || []}
          participants={participants || []}
          userBalance={
            profile?.is_test_user
              ? ((profile?.wallets as any)?.test_balance ?? 0)
              : ((profile?.wallets as any)?.balance_stablecoin ?? 0)
          }
          isTestUser={profile?.is_test_user ?? false}
          isLoggedIn={!!user}
          isPremium={profile?.is_premium || false}
          isUnlocked={isUnlocked}
          betMarkets={betMarkets || []}
          liveMatchIds={liveMatchIds}
          userBets={userBets}
        />
      </div>
    </main>
  )
}
