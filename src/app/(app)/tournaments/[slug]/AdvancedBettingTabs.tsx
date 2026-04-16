'use client'

import { useState } from 'react'
import { BetForm } from './BetForm'
import { validateStreamerCode } from '@/lib/actions/codes'

interface BetMarket {
  id: string
  market_type: string
  round_number: number | null
  pt_match_id: string | null
  status: string
  total_volume: number
  kronix_volume: number
}

interface Props {
  tournament: any
  teams: any[]
  participants: any[]
  userBalance: number
  isLoggedIn: boolean
  isPremium: boolean
  isUnlocked: boolean
  betMarkets: BetMarket[]
}

const MARKET_LABELS: Record<string, string> = {
  tournament_winner:    '🏆 GANADOR TORNEO',
  tournament_mvp:       '🎖️ MVP TORNEO',
  round_winner:         '⚔️ GANADOR RONDA',
  round_top_fragger:    '💥 TOP KILLS (EQUIPO)',
  round_top_placement:  '📍 TOP PLACEMENT',
  round_player_fragger: '🎯 TOP FRAGGER',
}

const TAB_BG: Record<string, string> = {
  tournament_winner:    '#00F5FF',
  tournament_mvp:       '#8b5cf6',
  round_winner:         '#10b981',
  round_top_fragger:    '#f59e0b',
  round_top_placement:  '#ec4899',
  round_player_fragger: '#f97316',
}

const TAB_COLOR: Record<string, string> = {
  tournament_winner:    '#000',
  tournament_mvp:       '#fff',
  round_winner:         '#fff',
  round_top_fragger:    '#000',
  round_top_placement:  '#fff',
  round_player_fragger: '#fff',
}

export function AdvancedBettingTabs({
  tournament, teams, participants, userBalance,
  isLoggedIn, isPremium, isUnlocked, betMarkets,
}: Props) {
  const [code, setCode]           = useState('')
  const [isUnlocking, setUnlock]  = useState(false)
  const [unlockError, setError]   = useState('')
  const [activeTab, setActiveTab] = useState<string>('')

  const handleUnlock = async () => {
    setUnlock(true); setError('')
    const res = await validateStreamerCode(tournament.id, code)
    if (res?.error) setError(res.error)
    else window.location.reload()
    setUnlock(false)
  }

  // ── NOT LOGGED IN ────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', gap: '1.5rem', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ fontSize: '2.5rem' }}>⚡</div>
        <h2 className="font-orbitron" style={{ fontSize: '1.4rem', letterSpacing: '0.1em', textAlign: 'center' }}>
          INICIA SESIÓN PARA <span className="neon-text-cyan">APOSTAR</span>
        </h2>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.9rem', color: 'hsl(var(--text-muted))', textAlign: 'center', lineHeight: 1.6 }}>
          Crea una cuenta o inicia sesión para ingresar tu código de streamer y acceder a los mercados de apuestas.
        </p>
        <a href="/login" className="btn-primary" style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textDecoration: 'none', padding: '0.85rem 2rem' }}>
          ENTRAR / REGISTRARSE
        </a>
      </div>
    )
  }

  // ── LOCKED ───────────────────────────────────────────────────────────────
  if (!isUnlocked && !isPremium) {
    return (
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', gap: '1.5rem', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ fontSize: '2.5rem' }}>🔒</div>
        <h2 className="font-orbitron" style={{ fontSize: '1.4rem', letterSpacing: '0.1em', textAlign: 'center' }}>
          ACCESO <span className="neon-text-cyan">EXCLUSIVO</span>
        </h2>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.9rem', color: 'hsl(var(--text-muted))', textAlign: 'center', lineHeight: 1.6, letterSpacing: '0.03em' }}>
          Este torneo está reservado para la comunidad de patrocinadores. Ingresa el código de tu streamer o adquiere Premium.
        </p>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="text" placeholder="CÓDIGO DE STREAMER"
            value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem', textAlign: 'center', fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', letterSpacing: '0.2em', color: '#00F5FF', outline: 'none', boxSizing: 'border-box' }}
          />
          {unlockError && <p style={{ fontSize: '0.7rem', color: '#f87171', textAlign: 'center', letterSpacing: '0.08em', fontFamily: 'Rajdhani, sans-serif' }}>{unlockError}</p>}
          <button onClick={handleUnlock} disabled={isUnlocking || !code} className="btn-primary" style={{ width: '100%', fontSize: '0.75rem', letterSpacing: '0.15em' }}>
            {isUnlocking ? 'VALIDANDO...' : 'DESBLOQUEAR AHORA'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
            <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.1em' }}>O TAMBIÉN</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
          </div>
          <button className="btn-secondary" style={{ width: '100%', fontSize: '0.7rem', letterSpacing: '0.12em', color: 'hsl(var(--neon-purple))' }}>
            HAZTE PREMIUM (20 USDT)
          </button>
        </div>
      </div>
    )
  }

  // ── UNLOCKED — show all markets ──────────────────────────────────────────

  // Split markets by level
  const tournamentMarkets = betMarkets.filter(m =>
    m.market_type === 'tournament_winner' || m.market_type === 'tournament_mvp'
  )
  const roundMarkets = betMarkets.filter(m =>
    m.market_type !== 'tournament_winner' && m.market_type !== 'tournament_mvp'
  )

  // Group round markets by round_number
  const roundGroups: Record<number, BetMarket[]> = {}
  for (const m of roundMarkets) {
    const r = m.round_number ?? 0
    if (!roundGroups[r]) roundGroups[r] = []
    roundGroups[r].push(m)
  }
  const roundNumbers = Object.keys(roundGroups).map(Number).sort((a, b) => a - b)

  // Available tabs = tournament markets + one tab per round
  const tabs: { key: string; label: string; color: string; textColor: string }[] = [
    ...tournamentMarkets.map(m => ({
      key: m.market_type,
      label: MARKET_LABELS[m.market_type] ?? m.market_type,
      color: TAB_BG[m.market_type] ?? '#00F5FF',
      textColor: TAB_COLOR[m.market_type] ?? '#000',
    })),
    ...roundNumbers.map(r => ({
      key: `round_${r}`,
      label: `⚔️ RONDA ${r}`,
      color: '#10b981',
      textColor: '#fff',
    })),
  ]

  const currentTab = activeTab || tabs[0]?.key || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Tab bar */}
      {tabs.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', width: 'fit-content' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="font-orbitron"
              style={{
                padding: '0.6rem 1.5rem', borderRadius: '10px',
                fontSize: '0.65rem', letterSpacing: '0.1em',
                border: 'none', cursor: 'pointer',
                transition: 'background 150ms ease-out, color 150ms ease-out',
                background: currentTab === t.key ? t.color : 'transparent',
                color: currentTab === t.key ? t.textColor : 'hsl(var(--text-muted))',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="font-orbitron" style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'hsl(var(--text-muted))' }}>
            SIN MERCADOS ABIERTOS
          </p>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '0.5rem' }}>
            Los mercados aparecerán cuando el torneo esté activo. Presiona SYNC en el panel admin.
          </p>
        </div>
      )}

      {/* ── Tournament winner ── */}
      {currentTab === 'tournament_winner' && (
        <div>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            Apuesta al equipo que ganará el torneo completo.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {teams.length > 0 ? teams.map(team => (
              <BetForm key={team.id} team={team} tournamentId={tournament.id} userBalance={userBalance} isLoggedIn={isLoggedIn} type="winner" />
            )) : (
              <p style={{ color: 'hsl(var(--text-muted))', fontFamily: 'Rajdhani, sans-serif' }}>Sin equipos registrados aún.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Tournament MVP ── */}
      {currentTab === 'tournament_mvp' && (
        <div>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            Apuesta al jugador con más kills acumuladas en todo el torneo.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {participants.length > 0 ? participants.map(player => (
              <BetForm key={player.id} team={null} player={player} tournamentId={tournament.id} userBalance={userBalance} isLoggedIn={isLoggedIn} type="top_fragger_tournament" />
            )) : (
              <p style={{ color: 'hsl(var(--text-muted))', fontFamily: 'Rajdhani, sans-serif' }}>Sin participantes registrados aún.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Round markets ── */}
      {roundNumbers.map(r => currentTab === `round_${r}` && (
        <div key={r}>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
            Mercados de la Ronda {r} — apuesta antes de que comience.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {roundGroups[r].map(market => (
              <div key={market.id}>
                <h4 className="font-orbitron" style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: '#10b981', marginBottom: '0.75rem' }}>
                  {MARKET_LABELS[market.market_type] ?? market.market_type}
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontFamily: 'Rajdhani, sans-serif' }}>
                    Vol: ${Number(market.total_volume).toFixed(2)}
                  </span>
                </h4>
                {market.status !== 'open' ? (
                  <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'Orbitron, sans-serif', color: 'hsl(var(--text-muted))', letterSpacing: '0.1em' }}>
                      MERCADO {market.status.toUpperCase()} — no se aceptan más apuestas
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {/* round_winner / round_top_fragger → bet on teams */}
                    {(market.market_type === 'round_winner' || market.market_type === 'round_top_fragger' || market.market_type === 'round_top_placement') &&
                      teams.map(team => (
                        <BetForm key={team.id} team={team} tournamentId={tournament.id} userBalance={userBalance} isLoggedIn={isLoggedIn} type="top_fragger_match" />
                      ))
                    }
                    {/* round_player_fragger → bet on individual players */}
                    {market.market_type === 'round_player_fragger' &&
                      participants.map(player => (
                        <BetForm key={player.id} team={null} player={player} tournamentId={tournament.id} userBalance={userBalance} isLoggedIn={isLoggedIn} type="top_fragger_match" />
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

    </div>
  )
}
