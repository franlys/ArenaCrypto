import { createClient } from '@/lib/supabase/server'
import { tournamentDb } from '@/lib/supabase/tournament-db'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const MARKET_META: Record<string, { icon: string; label: string }> = {
  tournament_winner:    { icon: '🏆', label: 'Ganador del Torneo' },
  tournament_mvp:       { icon: '🎖️', label: 'MVP del Torneo' },
  round_winner:         { icon: '🥇', label: 'Ganador de Partida' },
  round_top_fragger:    { icon: '💥', label: 'Equipo Más Letal' },
  round_top_placement:  { icon: '📍', label: 'Mejor Posicionamiento' },
  round_player_fragger: { icon: '🎯', label: 'Jugador Más Letal' },
}

export default async function HistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // All bets for this user
  const { data: bets } = await supabase
    .from('tournament_bets')
    .select(`
      id, market_id, pt_tournament_id, pt_target_name, amount, status,
      payout_amount, resolved_at, created_at, is_test,
      bet_markets!market_id(market_type, round_number, status,
        result_pt_team_id, result_pt_player_id)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const allBets = (bets ?? []).map((b: any) => ({
    ...b,
    bet_markets: Array.isArray(b.bet_markets) ? (b.bet_markets[0] ?? null) : (b.bet_markets ?? null),
  }))

  // Group by tournament
  const tournamentIds = [...new Set(allBets.map((b: any) => b.pt_tournament_id as string))]

  // Fetch tournament names from PT
  const { data: ptTournaments } = tournamentIds.length > 0
    ? await tournamentDb.from('tournaments').select('id, name, slug, status').in('id', tournamentIds)
    : { data: [] }

  const tournamentMap = Object.fromEntries((ptTournaments ?? []).map((t: any) => [t.id, t]))

  // Build per-tournament summaries
  const groups = tournamentIds.map(tid => {
    const tbets = allBets.filter((b: any) => b.pt_tournament_id === tid)
    const tournament = tournamentMap[tid]

    const totalStaked    = tbets.reduce((s: number, b: any) => s + Number(b.amount), 0)
    const totalPayout    = tbets.reduce((s: number, b: any) => s + Number(b.payout_amount ?? 0), 0)
    const netPnl         = totalPayout - totalStaked

    const wonCount     = tbets.filter((b: any) => b.status === 'won' || b.status === 'paid').length
    const lostCount    = tbets.filter((b: any) => b.status === 'lost').length
    const pendingCount = tbets.filter((b: any) => b.status === 'pending').length

    return { tid, tournament, tbets, totalStaked, totalPayout, netPnl, wonCount, lostCount, pendingCount }
  })

  const overallStaked = groups.reduce((s, g) => s + g.totalStaked, 0)
  const overallPayout = groups.reduce((s, g) => s + g.totalPayout, 0)
  const overallPnl    = overallPayout - overallStaked

  return (
    <main style={{ minHeight: '100vh', background: 'hsl(var(--bg-primary))', color: 'hsl(var(--text-primary))' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <Link href="/tournaments" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'hsl(var(--text-muted))', textDecoration: 'none', fontSize: '0.65rem', letterSpacing: '0.1em', fontFamily: 'Orbitron, sans-serif', marginBottom: '1.25rem' }}>
            ← TORNEOS
          </Link>
          <h1 className="font-orbitron" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', letterSpacing: '-0.02em' }}>
            HISTORIAL DE <span className="neon-text-cyan">APUESTAS</span>
          </h1>
          <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.5rem', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.95rem' }}>
            Tus resultados y rendimiento en todos los torneos.
          </p>
        </div>

        {allBets.length === 0 ? (
          <div className="glass-panel" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
            <p className="font-orbitron" style={{ fontSize: '0.7rem', letterSpacing: '0.18em', color: 'hsl(var(--text-muted))' }}>
              AÚN NO HAS REALIZADO APUESTAS
            </p>
            <Link href="/tournaments" style={{ display: 'inline-block', marginTop: '1.5rem', fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.12em', color: '#00F5FF' }}>
              IR A TORNEOS →
            </Link>
          </div>
        ) : (
          <>
            {/* Global P&L card */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem', marginBottom: '2.5rem',
            }}>
              {[
                { label: 'TOTAL APOSTADO',  value: `$${overallStaked.toFixed(2)}`,  color: '#00F5FF' },
                { label: 'TOTAL RECUPERADO', value: `$${overallPayout.toFixed(2)}`, color: '#8b5cf6' },
                {
                  label: 'RESULTADO NETO',
                  value: `${overallPnl >= 0 ? '+' : ''}$${overallPnl.toFixed(2)}`,
                  color: overallPnl > 0 ? '#10b981' : overallPnl < 0 ? '#f87171' : 'hsl(var(--text-muted))',
                },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  padding: '1rem 1.25rem', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.5rem', letterSpacing: '0.14em', color: 'hsl(var(--text-muted))', margin: 0 }}>
                    {label}
                  </p>
                  <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.3rem', fontWeight: 700, color, margin: '0.4rem 0 0' }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Per-tournament groups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {groups.map(({ tid, tournament, tbets, totalStaked, totalPayout, netPnl, wonCount, lostCount, pendingCount }) => (
                <section key={tid} style={{
                  borderRadius: '14px', overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.09)',
                  background: 'rgba(0,0,0,0.25)',
                }}>
                  {/* Tournament header */}
                  <div style={{
                    padding: '1rem 1.25rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
                  }}>
                    <div>
                      <p className="font-orbitron" style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: 'hsl(var(--text-primary))', margin: 0 }}>
                        {tournament?.name ?? tid.slice(0, 12)}
                      </p>
                      <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', margin: '0.2rem 0 0', letterSpacing: '0.04em' }}>
                        {wonCount}G · {lostCount}P{pendingCount > 0 ? ` · ${pendingCount} pendientes` : ''}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                      {/* Mini P&L */}
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'hsl(var(--text-muted))', margin: 0 }}>
                          NETO
                        </p>
                        <p style={{
                          fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', fontWeight: 700, margin: '0.15rem 0 0',
                          color: netPnl > 0 ? '#10b981' : netPnl < 0 ? '#f87171' : 'hsl(var(--text-muted))',
                        }}>
                          {netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}
                        </p>
                      </div>

                      {tournament?.slug && (
                        <Link
                          href={`/tournaments/${tournament.slug}`}
                          style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.55rem', letterSpacing: '0.1em', color: '#00F5FF', textDecoration: 'none' }}
                        >
                          VER →
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Bets list */}
                  {tbets.map((bet: any, i: number) => {
                    const mt      = bet.bet_markets?.market_type ?? ''
                    const meta    = MARKET_META[mt] ?? { icon: '❓', label: mt }
                    const rn      = bet.bet_markets?.round_number
                    const label   = rn ? `${meta.label} — P${rn}` : meta.label
                    const isWon   = bet.status === 'won' || bet.status === 'paid'
                    const isLost  = bet.status === 'lost'
                    const payout  = Number(bet.payout_amount ?? 0)

                    return (
                      <div key={bet.id} style={{
                        padding: '0.8rem 1.25rem',
                        borderBottom: i < tbets.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        background: isWon ? 'rgba(16,185,129,0.025)' : isLost ? 'rgba(248,113,113,0.025)' : 'transparent',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                      }}>
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', minWidth: 0 }}>
                          <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{meta.icon}</span>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.55rem', letterSpacing: '0.1em', color: 'hsl(var(--text-muted))', margin: 0 }}>
                              {label}
                            </p>
                            <p style={{
                              fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                              letterSpacing: '0.03em', textTransform: 'uppercase', margin: '0.15rem 0 0',
                              color: isWon ? '#10b981' : isLost ? '#f87171' : 'hsl(var(--text-primary))',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {bet.pt_target_name ?? '—'}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexShrink: 0 }}>
                          {/* Status badge */}
                          {isWon ? (
                            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.55rem', letterSpacing: '0.08em', color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
                              ✓ GANADA
                            </span>
                          ) : isLost ? (
                            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.55rem', letterSpacing: '0.08em', color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
                              ✗ PERDIDA
                            </span>
                          ) : (
                            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.55rem', letterSpacing: '0.08em', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
                              ⏳ PEND.
                            </span>
                          )}

                          {/* Amounts */}
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0 }}>
                              ${Number(bet.amount).toFixed(2)}
                            </p>
                            {isWon && payout > 0 && (
                              <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.7rem', color: '#10b981', margin: '0.1rem 0 0', letterSpacing: '0.03em' }}>
                                +${payout.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
