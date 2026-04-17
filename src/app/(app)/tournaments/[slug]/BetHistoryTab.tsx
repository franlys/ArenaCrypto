'use client'

const MARKET_META: Record<string, { icon: string; label: string; color: string; accentRgb: string }> = {
  tournament_winner:    { icon: '🏆', label: 'GANADOR DEL TORNEO',       color: '#00F5FF', accentRgb: '0,245,255' },
  tournament_mvp:       { icon: '🎖️', label: 'MVP DEL TORNEO',           color: '#8b5cf6', accentRgb: '139,92,246' },
  round_winner:         { icon: '🥇', label: 'GANADOR DE PARTIDA',        color: '#10b981', accentRgb: '16,185,129' },
  round_top_fragger:    { icon: '💥', label: 'EQUIPO MÁS LETAL',          color: '#f59e0b', accentRgb: '245,158,11' },
  round_top_placement:  { icon: '📍', label: 'MEJOR POSICIONAMIENTO',      color: '#ec4899', accentRgb: '236,72,153' },
  round_player_fragger: { icon: '🎯', label: 'JUGADOR MÁS LETAL',          color: '#f97316', accentRgb: '249,115,22' },
}

interface Bet {
  id: string
  market_id: string
  pt_target_id: string | null
  pt_target_name: string | null
  amount: number
  status: string
  resolved_at: string | null
  created_at: string
  bet_markets: {
    market_type: string
    round_number: number | null
    status: string
    result_pt_team_id: string | null
    result_pt_player_id: string | null
    resolved_at: string | null
  } | null
}

interface Props {
  userBets: Bet[]
  teams: any[]
  participants: any[]
}

function statusBadge(betStatus: string) {
  if (betStatus === 'won' || betStatus === 'paid') {
    return (
      <span style={{
        fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.1em',
        color: '#10b981', background: 'rgba(16,185,129,0.12)',
        border: '1px solid rgba(16,185,129,0.3)',
        padding: '0.2rem 0.6rem', borderRadius: '20px',
      }}>
        ✓ GANADA
      </span>
    )
  }
  if (betStatus === 'lost') {
    return (
      <span style={{
        fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.1em',
        color: '#f87171', background: 'rgba(248,113,113,0.1)',
        border: '1px solid rgba(248,113,113,0.25)',
        padding: '0.2rem 0.6rem', borderRadius: '20px',
      }}>
        ✗ PERDIDA
      </span>
    )
  }
  if (betStatus === 'canceled') {
    return (
      <span style={{
        fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.1em',
        color: 'hsl(var(--text-muted))', background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '0.2rem 0.6rem', borderRadius: '20px',
      }}>
        CANCELADA
      </span>
    )
  }
  // pending
  return (
    <span style={{
      fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.1em',
      color: '#f59e0b', background: 'rgba(245,158,11,0.1)',
      border: '1px solid rgba(245,158,11,0.25)',
      padding: '0.2rem 0.6rem', borderRadius: '20px',
    }}>
      ⏳ PENDIENTE
    </span>
  )
}

export function BetHistoryTab({ userBets, teams, participants }: Props) {
  const totalWagered = userBets.reduce((s, b) => s + Number(b.amount), 0)
  const wonCount     = userBets.filter(b => b.status === 'won' || b.status === 'paid').length
  const lostCount    = userBets.filter(b => b.status === 'lost').length
  const pendingCount = userBets.filter(b => b.status === 'pending').length

  // Helper: name from id
  const teamName   = (id: string | null) => id ? (teams.find(t => t.id === id)?.name ?? id.slice(0, 8)) : null
  const playerName = (id: string | null) => id ? (participants.find(p => p.id === id)?.display_name ?? id.slice(0, 8)) : null

  // Market label
  const marketLabel = (bet: Bet) => {
    const mt   = bet.bet_markets?.market_type ?? ''
    const meta = MARKET_META[mt]
    const base = meta?.label ?? mt.toUpperCase()
    if (bet.bet_markets?.round_number) return `${base} — PARTIDA ${bet.bet_markets.round_number}`
    return base
  }

  // Result text
  const resultText = (bet: Bet): string | null => {
    const m = bet.bet_markets
    if (!m || m.status !== 'resolved') return null
    const winner = m.result_pt_player_id
      ? playerName(m.result_pt_player_id)
      : teamName(m.result_pt_team_id)
    if (!winner) return null
    return `Ganó: ${winner}`
  }

  if (userBets.length === 0) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <p className="font-orbitron" style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'hsl(var(--text-muted))' }}>
          SIN APUESTAS AÚN
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Summary bar ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '0.75rem',
      }}>
        {[
          { label: 'APOSTADO',  value: `$${totalWagered.toFixed(2)}`, color: '#00F5FF' },
          { label: 'GANADAS',   value: String(wonCount),              color: '#10b981' },
          { label: 'PERDIDAS',  value: String(lostCount),             color: '#f87171' },
          { label: 'PENDIENTE', value: String(pendingCount),          color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: '0.85rem 1rem', borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', gap: '0.3rem',
          }}>
            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.55rem', letterSpacing: '0.12em', color: 'hsl(var(--text-muted))' }}>
              {label}
            </span>
            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.1rem', fontWeight: 700, color }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Bets list ── */}
      <div style={{
        borderRadius: '12px', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        {userBets.map((bet, i) => {
          const mt        = bet.bet_markets?.market_type ?? ''
          const meta      = MARKET_META[mt] ?? { icon: '❓', color: '#00F5FF', accentRgb: '0,245,255', label: mt }
          const result    = resultText(bet)
          const isResolved = bet.bet_markets?.status === 'resolved'
          const isWon      = bet.status === 'won' || bet.status === 'paid'
          const isLost     = bet.status === 'lost'

          return (
            <div
              key={bet.id}
              style={{
                borderBottom: i < userBets.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                padding: '0.9rem 1rem',
                background: isWon ? 'rgba(16,185,129,0.03)' : isLost ? 'rgba(248,113,113,0.03)' : 'transparent',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{meta.icon}</span>
                <span className="font-orbitron" style={{ flex: 1, fontSize: '0.6rem', letterSpacing: '0.1em', color: meta.color, minWidth: 0 }}>
                  {marketLabel(bet)}
                </span>
                {statusBadge(bet.status)}
              </div>

              {/* Bottom row — pick + amount */}
              <div style={{ marginTop: '0.55rem', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexWrap: 'wrap', paddingLeft: '1.6rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: 'Rajdhani, sans-serif', fontWeight: 700,
                    fontSize: '0.9rem', letterSpacing: '0.04em',
                    color: isWon ? '#10b981' : isLost ? '#f87171' : 'hsl(var(--text-primary))',
                    textTransform: 'uppercase', margin: 0,
                  }}>
                    {bet.pt_target_name ?? '—'}
                  </p>
                  {isResolved && result && (
                    <p style={{
                      fontFamily: 'Rajdhani, sans-serif', fontSize: '0.78rem',
                      color: 'hsl(var(--text-muted))', letterSpacing: '0.03em',
                      margin: '0.15rem 0 0',
                    }}>
                      {result}
                    </p>
                  )}
                  {!isResolved && (
                    <p style={{
                      fontFamily: 'Rajdhani, sans-serif', fontSize: '0.72rem',
                      color: 'hsl(var(--text-muted))', letterSpacing: '0.03em',
                      margin: '0.15rem 0 0',
                    }}>
                      Mercado {bet.bet_markets?.status === 'open' ? 'abierto' : bet.bet_markets?.status === 'closed' ? 'cerrado — pendiente de resolución' : bet.bet_markets?.status ?? 'pendiente'}
                    </p>
                  )}
                </div>
                <span style={{
                  fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem',
                  fontWeight: 700, color: 'hsl(var(--text-primary))',
                  letterSpacing: '0.05em', flexShrink: 0,
                }}>
                  ${Number(bet.amount).toFixed(2)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{
        fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem',
        color: 'hsl(var(--text-muted))', letterSpacing: '0.04em', textAlign: 'center',
      }}>
        Los pagos se acreditan automáticamente cuando el administrador resuelve cada mercado.
      </p>
    </div>
  )
}
