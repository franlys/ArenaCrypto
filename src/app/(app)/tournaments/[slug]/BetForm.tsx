'use client'

import { useState } from 'react'
import { placeTournamentBet } from '@/lib/actions/betting'

interface BetFormProps {
  team: any | null
  player?: any
  tournamentId: string
  userBalance: number
  isLoggedIn: boolean
  type: 'winner' | 'top_fragger_tournament' | 'top_fragger_match'
}

export function BetForm({ team, player, tournamentId, userBalance, isLoggedIn, type }: BetFormProps) {
  const [amount, setAmount] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleBet = async () => {
    if (!isLoggedIn) {
      setMessage({ type: 'error', text: 'Debes iniciar sesión para apostar' })
      return
    }
    if (amount > userBalance) {
      setMessage({ type: 'error', text: 'Saldo insuficiente' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    const res = await placeTournamentBet({
      ptTournamentId: tournamentId,
      ptTeamId: team?.id || null,
      amount,
      targetType: type,
      ptTargetId: player?.id || team?.id,
      ptTargetName: player?.display_name || team?.name,
    })

    if ('error' in res) {
      setMessage({ type: 'error', text: res.error })
    } else {
      setMessage({ type: 'success', text: '¡Apuesta realizada!' })
    }
    setIsLoading(false)
  }

  if (type === 'top_fragger_tournament' && player) {
    return (
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.6rem', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.1em', color: 'hsl(var(--text-muted))', marginBottom: '0.25rem' }}>MVP TORNEO</p>
          <h4 style={{ fontSize: '0.85rem', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, letterSpacing: '0.05em', color: 'hsl(var(--text-primary))', textTransform: 'uppercase' }}>{player.display_name}</h4>
        </div>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min={1} style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.8rem', color: 'hsl(var(--neon-purple))', textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
        <button onClick={handleBet} disabled={isLoading || !isLoggedIn} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: 'hsl(var(--neon-purple))', fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer', opacity: isLoading ? 0.6 : 1 }}>
          {isLoading ? '...' : 'APOSTAR MVP'}
        </button>
        {message && <p style={{ fontSize: '0.65rem', textAlign: 'center', color: message.type === 'error' ? '#f87171' : '#10b981', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>{message.text}</p>}
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(0,245,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, color: '#00F5FF', fontSize: '1rem', flexShrink: 0 }}>
          {team?.name?.[0] || '?'}
        </div>
        <div>
          <h4 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'hsl(var(--text-primary))' }}>{team?.name}</h4>
          <p style={{ fontSize: '0.65rem', fontFamily: 'Rajdhani, sans-serif', color: 'hsl(var(--text-muted))', letterSpacing: '0.05em' }}>EQUIPO</p>
        </div>
      </div>

      <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min={1} style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.9rem', color: '#00F5FF', outline: 'none', boxSizing: 'border-box' }} />

      <button onClick={handleBet} disabled={isLoading || !isLoggedIn} className="btn-primary" style={{ width: '100%', fontSize: '0.7rem', letterSpacing: '0.15em', opacity: isLoading ? 0.6 : 1 }}>
        {isLoading ? 'PROCESANDO...' : 'APOSTAR GANADOR'}
      </button>

      {message && <p style={{ fontSize: '0.7rem', textAlign: 'center', color: message.type === 'error' ? '#f87171' : '#10b981', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>{message.text}</p>}
    </div>
  )
}
