'use client'

import { useState } from 'react'
import { BetForm } from './BetForm'
import { validateStreamerCode } from '@/lib/actions/codes'

interface Props {
  tournament: any
  teams: any[]
  participants: any[]
  userBalance: number
  isLoggedIn: boolean
  isPremium: boolean
  isUnlocked: boolean
}

export function AdvancedBettingTabs({
  tournament,
  teams,
  participants,
  userBalance,
  isLoggedIn,
  isPremium,
  isUnlocked,
}: Props) {
  const [activeTab, setActiveTab] = useState<'winner' | 'mvp'>('winner')
  const [code, setCode] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState('')

  const handleUnlock = async () => {
    setIsUnlocking(true)
    setUnlockError('')
    const res = await validateStreamerCode(tournament.id, code)
    if (res?.error) {
      setUnlockError(res.error)
    } else {
      window.location.reload()
    }
    setIsUnlocking(false)
  }

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
            type="text"
            placeholder="CÓDIGO DE STREAMER"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem', textAlign: 'center', fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', letterSpacing: '0.2em', color: '#00F5FF', outline: 'none', boxSizing: 'border-box' }}
          />
          {unlockError && <p style={{ fontSize: '0.7rem', color: '#f87171', textAlign: 'center', letterSpacing: '0.08em', fontFamily: 'Rajdhani, sans-serif' }}>{unlockError}</p>}

          <button
            onClick={handleUnlock}
            disabled={isUnlocking || !code}
            className="btn-primary"
            style={{ width: '100%', fontSize: '0.75rem', letterSpacing: '0.15em' }}
          >
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

  // Unlocked or premium — show betting UI
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', padding: '0.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('winner')}
          className="font-orbitron"
          style={{ padding: '0.6rem 2rem', borderRadius: '10px', fontSize: '0.7rem', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', transition: 'background 150ms ease-out, color 150ms ease-out', background: activeTab === 'winner' ? '#00F5FF' : 'transparent', color: activeTab === 'winner' ? '#000' : 'hsl(var(--text-muted))' }}
        >
          🏆 GANADOR
        </button>
        <button
          onClick={() => setActiveTab('mvp')}
          className="font-orbitron"
          style={{ padding: '0.6rem 2rem', borderRadius: '10px', fontSize: '0.7rem', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', transition: 'background 150ms ease-out, color 150ms ease-out', background: activeTab === 'mvp' ? 'hsl(var(--neon-purple))' : 'transparent', color: activeTab === 'mvp' ? '#fff' : 'hsl(var(--text-muted))' }}
        >
          🎖️ MVP TORNEO
        </button>
      </div>

      {activeTab === 'winner' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {teams.map((team) => (
            <BetForm key={team.id} team={team} tournamentId={tournament.id} userBalance={userBalance} isLoggedIn={isLoggedIn} type="winner" />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {participants.map((player) => (
            <BetForm key={player.id} team={null} player={player} tournamentId={tournament.id} userBalance={userBalance} isLoggedIn={isLoggedIn} type="top_fragger_tournament" />
          ))}
        </div>
      )}
    </div>
  )
}
