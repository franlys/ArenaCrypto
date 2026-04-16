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
  liveMatchIds?: string[]
}

// ── Static metadata per market type ─────────────────────────────────────────

const MARKET_META: Record<string, {
  icon: string
  label: string
  description: string
  color: string
  accentRgb: string
}> = {
  tournament_winner: {
    icon: '🏆',
    label: 'GANADOR DEL TORNEO',
    description: 'Apuesta al equipo que saldrá campeón al finalizar todos los encuentros. Solo se resuelve al terminar el torneo.',
    color: '#00F5FF',
    accentRgb: '0,245,255',
  },
  tournament_mvp: {
    icon: '🎖️',
    label: 'MVP DEL TORNEO',
    description: 'El jugador con el mayor número de kills acumuladas en todos los encuentros del torneo.',
    color: '#8b5cf6',
    accentRgb: '139,92,246',
  },
  round_winner: {
    icon: '🥇',
    label: 'GANADOR DE PARTIDA',
    description: 'El equipo que termine en 1° lugar (mejor posición/ranking) en este encuentro específico.',
    color: '#10b981',
    accentRgb: '16,185,129',
  },
  round_top_fragger: {
    icon: '💥',
    label: 'EQUIPO MÁS LETAL',
    description: 'El equipo cuyos jugadores sumen la mayor cantidad de kills entre todos en este encuentro.',
    color: '#f59e0b',
    accentRgb: '245,158,11',
  },
  round_top_placement: {
    icon: '📍',
    label: 'MEJOR POSICIONAMIENTO',
    description: 'El equipo que acumule más puntos por posición (zonas / sobrevivencia) en este encuentro.',
    color: '#ec4899',
    accentRgb: '236,72,153',
  },
  round_player_fragger: {
    icon: '🎯',
    label: 'JUGADOR MÁS LETAL',
    description: 'El jugador individual con más kills en este encuentro, sin importar a qué equipo pertenece.',
    color: '#f97316',
    accentRgb: '249,115,22',
  },
}

const TAB_BG: Record<string, string> = {
  tournament_winner:    '#00F5FF',
  tournament_mvp:       '#8b5cf6',
}

const TAB_COLOR: Record<string, string> = {
  tournament_winner:    '#000',
  tournament_mvp:       '#fff',
}

// ── Tournament-level market header (with info toggle) ───────────────────────

function TournamentMarketSection({
  meta, label, children,
}: {
  meta: { icon: string; label: string; description: string; color: string; accentRgb: string }
  label: string
  children: React.ReactNode
}) {
  const [showInfo, setInfo] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1rem', borderRadius: '10px',
        background: `rgba(${meta.accentRgb},0.06)`,
        border: `1px solid rgba(${meta.accentRgb},0.2)`,
      }}>
        <span style={{ fontSize: '1.1rem' }}>{meta.icon}</span>
        <span className="font-orbitron" style={{ flex: 1, fontSize: '0.65rem', letterSpacing: '0.12em', color: meta.color }}>
          {label}
        </span>
        {/* Info button */}
        <button
          onClick={() => setInfo(v => !v)}
          title="¿Qué significa esta apuesta?"
          style={{
            width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer',
            background: showInfo ? `rgba(${meta.accentRgb},0.25)` : 'rgba(255,255,255,0.07)',
            border: `1px solid ${showInfo ? meta.color : 'rgba(255,255,255,0.12)'}`,
            color: showInfo ? meta.color : 'hsl(var(--text-muted))',
            fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.7rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 150ms, border-color 150ms, color 150ms',
          }}
        >
          i
        </button>
      </div>
      {/* Description panel */}
      {showInfo && (
        <div style={{
          padding: '0.6rem 0.85rem', borderRadius: '8px',
          background: `rgba(${meta.accentRgb},0.07)`,
          border: `1px solid rgba(${meta.accentRgb},0.2)`,
        }}>
          <p style={{
            fontFamily: 'Rajdhani, sans-serif', fontSize: '0.82rem',
            color: 'hsl(var(--text-primary))', lineHeight: 1.5, letterSpacing: '0.02em', margin: 0,
          }}>
            {meta.description}
          </p>
        </div>
      )}
      {children}
    </div>
  )
}

// ── CollapsibleMarket section ────────────────────────────────────────────────

function MarketSection({
  market, teams, participants, tournamentId, userBalance, isLoggedIn,
}: {
  market: BetMarket
  teams: any[]
  participants: any[]
  tournamentId: string
  userBalance: number
  isLoggedIn: boolean
}) {
  const [open, setOpen]       = useState(true)
  const [showInfo, setInfo]   = useState(false)
  const meta = MARKET_META[market.market_type] ?? {
    icon: '❓', label: market.market_type, description: '', color: '#00F5FF', accentRgb: '0,245,255',
  }

  const isTeamMarket   = ['round_winner', 'round_top_fragger', 'round_top_placement'].includes(market.market_type)
  const isPlayerMarket = market.market_type === 'round_player_fragger'
  const items          = isTeamMarket ? teams : (isPlayerMarket ? participants : [])

  const betType: 'top_fragger_match' = 'top_fragger_match'

  return (
    <div style={{
      border: `1px solid rgba(${meta.accentRgb},0.2)`,
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'rgba(0,0,0,0.2)',
    }}>
      {/* Section header */}
      <div style={{
        padding: '0.85rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{meta.icon}</span>

        {/* Label + meta — clickable to collapse */}
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            flex: 1, textAlign: 'left', cursor: 'pointer',
            background: 'transparent', border: 'none', padding: 0,
            display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
            minWidth: 0,
          }}
        >
          <span className="font-orbitron" style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: meta.color }}>
            {meta.label}
          </span>
          <span style={{ fontSize: '0.6rem', fontFamily: 'Rajdhani, sans-serif', color: 'hsl(var(--text-muted))', letterSpacing: '0.05em' }}>
            Vol: ${Number(market.total_volume).toFixed(2)} · {items.length} opciones
          </span>
          {market.status !== 'open' && (
            <span style={{
              fontSize: '0.55rem', fontFamily: 'Orbitron, sans-serif',
              letterSpacing: '0.1em', color: '#f87171',
              background: 'rgba(248,113,113,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px',
            }}>
              {market.status.toUpperCase()}
            </span>
          )}
        </button>

        {/* Info toggle */}
        <button
          onClick={e => { e.stopPropagation(); setInfo(v => !v) }}
          title="¿Qué significa esta apuesta?"
          style={{
            flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%',
            background: showInfo ? `rgba(${meta.accentRgb},0.25)` : 'rgba(255,255,255,0.07)',
            border: `1px solid ${showInfo ? meta.color : 'rgba(255,255,255,0.12)'}`,
            color: showInfo ? meta.color : 'hsl(var(--text-muted))',
            fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.7rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 150ms, border-color 150ms, color 150ms',
          }}
        >
          i
        </button>

        {/* Collapse arrow */}
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '0 0.25rem',
            fontSize: '0.6rem', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em',
            color: 'hsl(var(--text-muted))',
            transition: 'transform 200ms', display: 'inline-block',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▼
        </button>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div style={{
          margin: '0 1rem 0.75rem',
          padding: '0.6rem 0.85rem',
          borderRadius: '8px',
          background: `rgba(${meta.accentRgb},0.07)`,
          border: `1px solid rgba(${meta.accentRgb},0.2)`,
        }}>
          <p style={{
            fontFamily: 'Rajdhani, sans-serif', fontSize: '0.82rem',
            color: 'hsl(var(--text-primary))', lineHeight: 1.5, letterSpacing: '0.02em',
            margin: 0,
          }}>
            {meta.description}
          </p>
        </div>
      )}


      {/* Items list */}
      {open && (
        <div style={{ borderTop: `1px solid rgba(${meta.accentRgb},0.15)` }}>
          {market.status !== 'open' ? (
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <span style={{
                fontSize: '0.7rem', fontFamily: 'Orbitron, sans-serif',
                color: 'hsl(var(--text-muted))', letterSpacing: '0.1em',
              }}>
                MERCADO CERRADO — ya no se aceptan apuestas
              </span>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <span style={{
                fontSize: '0.75rem', fontFamily: 'Rajdhani, sans-serif',
                color: 'hsl(var(--text-muted))',
              }}>
                Sin {isTeamMarket ? 'equipos' : 'jugadores'} registrados aún.
              </span>
            </div>
          ) : (
            items.map((item: any) => (
              <BetForm
                key={item.id}
                team={isTeamMarket ? item : null}
                player={isPlayerMarket ? item : undefined}
                tournamentId={tournamentId}
                userBalance={userBalance}
                isLoggedIn={isLoggedIn}
                type={betType}
                compact
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function AdvancedBettingTabs({
  tournament, teams, participants, userBalance,
  isLoggedIn, isPremium, isUnlocked, betMarkets, liveMatchIds = [],
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

  // ── UNLOCKED ─────────────────────────────────────────────────────────────

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

  const tabs: { key: string; label: string; color: string; textColor: string }[] = [
    ...tournamentMarkets.map(m => ({
      key: m.market_type,
      label: MARKET_META[m.market_type]?.icon
        ? `${MARKET_META[m.market_type].icon} ${m.market_type === 'tournament_winner' ? 'CAMPEÓN' : 'MVP'}`
        : m.market_type,
      color: TAB_BG[m.market_type] ?? '#00F5FF',
      textColor: TAB_COLOR[m.market_type] ?? '#000',
    })),
    ...roundNumbers.map(r => {
      const matchIds = roundGroups[r].map(m => m.pt_match_id).filter(Boolean) as string[]
      const isLive   = matchIds.some(id => liveMatchIds.includes(id))
      return {
        key: `round_${r}`,
        label: isLive ? `🔴 PARTIDA ${r}` : `⚔️ PARTIDA ${r}`,
        color: isLive ? '#f87171' : '#10b981',
        textColor: '#fff',
        isLive,
      }
    }),
  ]

  const currentTab = activeTab || tabs[0]?.key || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Tab bar ── */}
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
      {currentTab === 'tournament_winner' && (() => {
        const meta = MARKET_META.tournament_winner
        return (
          <TournamentMarketSection meta={meta} label={meta.label}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {teams.length > 0 ? teams.map(team => (
                <BetForm key={team.id} team={team} tournamentId={tournament.id} userBalance={userBalance} isLoggedIn={isLoggedIn} type="winner" />
              )) : (
                <p style={{ color: 'hsl(var(--text-muted))', fontFamily: 'Rajdhani, sans-serif' }}>Sin equipos registrados aún.</p>
              )}
            </div>
          </TournamentMarketSection>
        )
      })()}

      {/* ── Tournament MVP ── */}
      {currentTab === 'tournament_mvp' && (() => {
        const meta = MARKET_META.tournament_mvp
        return (
          <TournamentMarketSection meta={meta} label={meta.label}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
              {participants.length > 0 ? participants.map(player => (
                <BetForm key={player.id} team={null} player={player} tournamentId={tournament.id} userBalance={userBalance} isLoggedIn={isLoggedIn} type="top_fragger_tournament" />
              )) : (
                <p style={{ color: 'hsl(var(--text-muted))', fontFamily: 'Rajdhani, sans-serif' }}>Sin participantes registrados aún.</p>
              )}
            </div>
          </TournamentMarketSection>
        )
      })()}

      {/* ── Round markets ── */}
      {roundNumbers.map(r => {
        if (currentTab !== `round_${r}`) return null
        const matchIds = roundGroups[r].map(m => m.pt_match_id).filter(Boolean) as string[]
        const isLive   = matchIds.some(id => liveMatchIds.includes(id))

        return (
          <div key={r} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Live banner */}
            {isLive && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: '10px',
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.3)',
              }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#f87171', flexShrink: 0,
                  boxShadow: '0 0 0 0 rgba(248,113,113,0.4)',
                  animation: 'pulse-dot 1.5s infinite',
                }} />
                <div>
                  <p className="font-orbitron" style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: '#f87171' }}>
                    PARTIDA EN CURSO
                  </p>
                  <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginTop: '0.15rem' }}>
                    Las apuestas están cerradas mientras la partida está activa. Puedes seguirla en vivo en Kronix.
                  </p>
                </div>
              </div>
            )}

            {!isLive && (
              <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.82rem', color: 'hsl(var(--text-muted))', letterSpacing: '0.04em', lineHeight: 1.5 }}>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Partida {r}</span> — Elige en cuál mercado quieres apostar. Cada uno evalúa un aspecto distinto. Puedes apostar en todos si quieres.
              </p>
            )}

            {roundGroups[r].map(market => (
              <MarketSection
                key={market.id}
                market={market}
                teams={teams}
                participants={participants}
                tournamentId={tournament.id}
                userBalance={userBalance}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        )
      })}

    </div>
  )
}
