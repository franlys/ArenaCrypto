import { tournamentDb } from '@/lib/supabase/tournament-db'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AdvancedBettingTabs } from './AdvancedBettingTabs'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export default async function TournamentDetailPage({ params }: Props) {
  const { data: tournament, error: tErr } = await tournamentDb
    .from('tournaments')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (tErr || !tournament) return notFound()

  const { data: teams } = await tournamentDb
    .from('teams')
    .select('*, participants(*)')
    .eq('tournament_id', tournament.id)

  const { data: participants } = await tournamentDb
    .from('participants')
    .select('id, display_name, team_id')
    .eq('tournament_id', tournament.id)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let isUnlocked = false

  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('id, username, balance, is_premium')
      .eq('id', user.id)
      .single()
    profile = p

    if (p?.is_premium) {
      isUnlocked = true
    } else {
      const { data: unlock } = await supabase
        .from('tournament_unlocks')
        .select('id')
        .eq('user_id', user.id)
        .eq('pt_tournament_id', tournament.id)
        .single()
      isUnlocked = !!unlock
    }
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
          userBalance={profile?.balance || 0}
          isLoggedIn={!!user}
          isPremium={profile?.is_premium || false}
          isUnlocked={isUnlocked}
        />
      </div>
    </main>
  )
}
