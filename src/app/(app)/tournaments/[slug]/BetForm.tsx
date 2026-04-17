'use client'

import { useState } from 'react'
import { placeTournamentBet } from '@/lib/actions/betting'

interface BetFormProps {
  team: any | null
  player?: any
  tournamentId: string
  marketId?: string
  userBalance: number
  isTestUser?: boolean
  isLoggedIn: boolean
  type: 'winner' | 'top_fragger_tournament' | 'top_fragger_match'
  compact?: boolean
}

const QUICK_AMOUNTS = [5, 10, 25, 50]

export function BetForm({ team, player, tournamentId, marketId, userBalance, isTestUser, isLoggedIn, type, compact }: BetFormProps) {
  const [amount, setAmount]     = useState(10)
  const [expanded, setExpanded] = useState(false)
  const [isLoading, setLoading] = useState(false)
  const [message, setMessage]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const label    = player?.display_name || team?.name || '?'
  const initial  = (player?.display_name || team?.name || '?')[0].toUpperCase()
  const accentColor = type === 'top_fragger_tournament' ? '#8b5cf6' : '#00F5FF'

  const handleBet = async () => {
    if (!isLoggedIn)        { setMessage({ type: 'error', text: 'Debes iniciar sesión' }); return }
    if (amount > userBalance){ setMessage({ type: 'error', text: 'Saldo insuficiente'  }); return }
    setLoading(true); setMessage(null)
    const res = await placeTournamentBet({
      ptTournamentId: tournamentId,
      ptTeamId:       team?.id || null,
      amount,
      targetType:     type,
      ptTargetId:     player?.id || team?.id,
      ptTargetName:   label,
      marketId,
    })
    if ('error' in res) setMessage({ type: 'error', text: res.error })
    else { setMessage({ type: 'success', text: '¡Apuesta confirmada!' }); setExpanded(false) }
    setLoading(false)
  }

  // ── COMPACT ROW MODE ────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Collapsed row */}
        <div
          onClick={() => { if (!message?.type || message.type === 'error') setExpanded(v => !v) }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.65rem 1rem', cursor: 'pointer',
            background: expanded ? 'rgba(0,245,255,0.04)' : 'transparent',
            transition: 'background 150ms',
          }}
        >
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
            background: `rgba(${accentColor === '#8b5cf6' ? '139,92,246' : '0,245,255'},0.12)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Orbitron, sans-serif', fontWeight: 700,
            color: accentColor, fontSize: '0.7rem',
          }}>
            {initial}
          </div>
          <span style={{
            flex: 1, fontFamily: 'Rajdhani, sans-serif', fontWeight: 600,
            fontSize: '0.9rem', letterSpacing: '0.04em',
            color: message?.type === 'success' ? '#10b981' : 'hsl(var(--text-primary))',
            textTransform: 'uppercase',
          }}>
            {label}
          </span>
          {message?.type === 'success' ? (
            <span style={{ fontSize: '0.65rem', fontFamily: 'Orbitron, sans-serif', color: '#10b981', letterSpacing: '0.08em' }}>
              ✓ APOSTADO
            </span>
          ) : (
            <span style={{
              fontSize: '0.6rem', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.1em',
              color: expanded ? accentColor : 'hsl(var(--text-muted))',
              transition: 'color 150ms',
            }}>
              {expanded ? 'CERRAR ▲' : 'APOSTAR ▼'}
            </span>
          )}
        </div>

        {/* Expanded inline form */}
        {expanded && (
          <div style={{
            padding: '0.75rem 1rem 1rem', background: 'rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column', gap: '0.6rem',
          }}>
            {/* Quick amounts */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {QUICK_AMOUNTS.map(q => (
                <button
                  key={q}
                  onClick={() => setAmount(q)}
                  style={{
                    padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                    fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.08em',
                    border: `1px solid ${amount === q ? accentColor : 'rgba(255,255,255,0.1)'}`,
                    background: amount === q ? `rgba(${accentColor === '#8b5cf6' ? '139,92,246' : '0,245,255'},0.15)` : 'transparent',
                    color: amount === q ? accentColor : 'hsl(var(--text-muted))',
                    transition: 'all 150ms',
                  }}
                >
                  ${q}
                </button>
              ))}
              {/* Custom amount */}
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Math.max(1, Number(e.target.value)))}
                min={1}
                placeholder="otro"
                style={{
                  width: '70px', background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                  padding: '0.3rem 0.5rem', fontSize: '0.8rem', color: accentColor,
                  outline: 'none', textAlign: 'center',
                }}
              />
            </div>
            {/* Confirm button */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={handleBet}
                disabled={isLoading}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: '8px', cursor: isLoading ? 'default' : 'pointer',
                  background: `rgba(${accentColor === '#8b5cf6' ? '139,92,246' : '0,245,255'},0.2)`,
                  border: `1px solid ${accentColor}55`,
                  color: accentColor, fontFamily: 'Orbitron, sans-serif',
                  fontSize: '0.65rem', letterSpacing: '0.1em',
                  opacity: isLoading ? 0.6 : 1, transition: 'opacity 150ms',
                }}
              >
                {isLoading ? 'PROCESANDO...' : `${isTestUser ? '[TEST] ' : ''}APOSTAR $${amount} USDT`}
              </button>
            </div>
            {message?.type === 'error' && (
              <p style={{ fontSize: '0.65rem', color: '#f87171', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>
                {message.text}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── CARD MODE (tournament-level markets) ────────────────────────────────────
  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
          background: `rgba(${accentColor === '#8b5cf6' ? '139,92,246' : '0,245,255'},0.1)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Orbitron, sans-serif', fontWeight: 700,
          color: accentColor, fontSize: '1rem',
        }}>
          {initial}
        </div>
        <div>
          <h4 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'hsl(var(--text-primary))' }}>
            {label}
          </h4>
          <p style={{ fontSize: '0.65rem', fontFamily: 'Rajdhani, sans-serif', color: 'hsl(var(--text-muted))', letterSpacing: '0.05em' }}>
            {player ? 'JUGADOR' : 'EQUIPO'}
          </p>
        </div>
      </div>

      {/* Quick amounts */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {QUICK_AMOUNTS.map(q => (
          <button
            key={q}
            onClick={() => setAmount(q)}
            style={{
              padding: '0.3rem 0.65rem', borderRadius: '6px', cursor: 'pointer',
              fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.08em',
              border: `1px solid ${amount === q ? accentColor : 'rgba(255,255,255,0.1)'}`,
              background: amount === q ? `rgba(${accentColor === '#8b5cf6' ? '139,92,246' : '0,245,255'},0.15)` : 'transparent',
              color: amount === q ? accentColor : 'hsl(var(--text-muted))',
              transition: 'all 150ms',
            }}
          >
            ${q}
          </button>
        ))}
        <input
          type="number" value={amount}
          onChange={e => setAmount(Math.max(1, Number(e.target.value)))}
          min={1}
          style={{
            width: '70px', background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
            padding: '0.3rem 0.5rem', fontSize: '0.8rem', color: accentColor,
            outline: 'none', textAlign: 'center',
          }}
        />
      </div>

      <button
        onClick={handleBet}
        disabled={isLoading || !isLoggedIn}
        className="btn-primary"
        style={{ width: '100%', fontSize: '0.7rem', letterSpacing: '0.15em', opacity: isLoading ? 0.6 : 1 }}
      >
        {isLoading ? 'PROCESANDO...' : `${isTestUser ? '[TEST] ' : ''}APOSTAR $${amount} USDT`}
      </button>

      {message && (
        <p style={{ fontSize: '0.7rem', textAlign: 'center', color: message.type === 'error' ? '#f87171' : '#10b981', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>
          {message.text}
        </p>
      )}
    </div>
  )
}
