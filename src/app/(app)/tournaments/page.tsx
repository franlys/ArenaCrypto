import { tournamentDb } from '@/lib/supabase/tournament-db'
import { Orbitron } from 'next/font/google'
import Link from 'next/link'
import AdZone from '@/components/Marketing/AdZone'

const orbitron = Orbitron({ subsets: ['latin'] })

export const dynamic = 'force-dynamic'

export default async function TournamentsPage() {
  const { data: tournaments, error } = await tournamentDb
    .from('tournaments')
    .select('*')
    .eq('arena_betting_enabled', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Bridge Error:', error)
  }

  return (
    <main style={{ minHeight: '100vh', background: 'hsl(var(--bg-primary))' }}>
      {/* Banner superior — solo a usuarios no-premium */}
      <AdZone position="banner_top" />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
          <div>
            <h1 className={`font-orbitron`} style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: 'hsl(var(--text-primary))' }}>
              TORNEOS DE <span className="neon-text-cyan">STREAMING</span>
            </h1>
            <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.5rem', fontFamily: 'Rajdhani, sans-serif', fontSize: '1rem', letterSpacing: '0.04em' }}>
              Apoya a tu streamer favorito y gana mientras ellos compiten.
            </p>
          </div>
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F5FF', boxShadow: '0 0 8px #00F5FF' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'hsl(var(--text-muted))', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Orbitron, sans-serif' }}>Conectado a Central de Torneos</span>
          </div>
        </div>

        {!tournaments || tournaments.length === 0 ? (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', borderStyle: 'dashed' }}>
            <p className="font-orbitron" style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'hsl(var(--text-muted))' }}>
              NO HAY TORNEOS CON APUESTAS ACTIVAS
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {tournaments.map((t, i) => (
              <>
                <TournamentCard key={t.id} tournament={t} />
                {/* Anuncio after card 3, then every 6 cards */}
                {(i === 2 || (i > 2 && (i - 2) % 6 === 0)) && (
                  <AdZone key={`ad-${i}`} position="between_tournaments" />
                )}
              </>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function TournamentCard({ tournament }: { tournament: any }) {
  const isActive = tournament.status === 'active'
  const isFinished = tournament.status === 'finished'
  const statusLabel = isActive ? '● EN VIVO' : isFinished ? 'FINALIZADO' : 'PRE-TORNEO'
  const statusColor = isActive ? '#10b981' : isFinished ? '#00F5FF' : 'hsl(var(--text-muted))'

  return (
    <Link href={`/tournaments/${tournament.slug}`} style={{ textDecoration: 'none' }}>
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', transition: 'border-color 200ms ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-orbitron" style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: statusColor }}>{statusLabel}</span>
          {tournament.arena_betting_status === 'open' && (
            <span style={{ fontSize: '0.6rem', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.08em', color: '#00F5FF', border: '1px solid rgba(0,245,255,0.3)', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>APUESTAS ABIERTAS</span>
          )}
        </div>

        <h3 className="font-orbitron" style={{ fontSize: '1rem', letterSpacing: '0.08em', color: 'hsl(var(--text-primary))', lineHeight: 1.3 }}>
          {tournament.name}
        </h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'Rajdhani, sans-serif', color: 'hsl(var(--text-muted))', letterSpacing: '0.05em' }}>
          <span>ENTRADA: ${tournament.entry_fee}</span>
          <span>BOLSA: ${(tournament.prize_1st || 0) + (tournament.prize_2nd || 0) + (tournament.prize_3rd || 0)}</span>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
          <span className="font-orbitron" style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: '#00F5FF' }}>VER DETALLES →</span>
        </div>
      </div>
    </Link>
  )
}
