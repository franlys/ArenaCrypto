'use client'

import { tournamentDb } from '@/lib/supabase/tournament-db'
import { Orbitron } from 'next/font/google'
import Link from 'next/link'
import AdZone from '@/components/Marketing/AdZone'
import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'

const orbitron = Orbitron({ subsets: ['latin'] })

type Tab = 'activos' | 'historial'

export default function TournamentsPage() {
  const { user } = useUser()
  const [tab, setTab] = useState<Tab>('activos')
  const [all, setAll] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    tournamentDb
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAll((data ?? []).filter((t: any) => t.arena_betting_enabled))
        setLoading(false)
      })
  }, [])

  const activos   = all.filter(t => t.status !== 'finished')
  const historial = all.filter(t => t.status === 'finished')
  const list      = tab === 'activos' ? activos : historial

  return (
    <main style={{ minHeight: '100vh', background: 'hsl(var(--bg-primary))' }}>
      <AdZone position="banner_top" />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div>
            <h1 className="font-orbitron" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: 'hsl(var(--text-primary))' }}>
              TORNEOS DE <span className="neon-text-cyan">STREAMING</span>
            </h1>
            <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.5rem', fontFamily: 'Rajdhani, sans-serif', fontSize: '1rem', letterSpacing: '0.04em' }}>
              Apoya a tu streamer favorito y gana mientras ellos compiten.
            </p>
          </div>
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F5FF', boxShadow: '0 0 8px #00F5FF' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'hsl(var(--text-muted))', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'Orbitron, sans-serif' }}>
              Conectado a Central de Torneos
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {(['activos', 'historial'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontFamily: 'Orbitron, sans-serif', fontSize: '0.65rem', letterSpacing: '0.14em',
                padding: '0.5rem 1.25rem', borderRadius: '6px', cursor: 'pointer', border: 'none',
                background: tab === t ? '#00F5FF' : 'rgba(255,255,255,0.06)',
                color: tab === t ? '#000' : 'hsl(var(--text-muted))',
                fontWeight: 700, transition: 'all 150ms',
              }}
            >
              {t === 'activos' ? `ACTIVOS${activos.length ? ` (${activos.length})` : ''}` : `HISTORIAL${historial.length ? ` (${historial.length})` : ''}`}
            </button>
          ))}
          <Link
            href={user ? '/historial' : '/login'}
            style={{
              marginLeft: 'auto', fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem',
              letterSpacing: '0.12em', padding: '0.5rem 1rem', borderRadius: '6px',
              border: '1px solid rgba(139,92,246,0.4)', color: '#8b5cf6',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            📋 MIS APUESTAS
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <p className="font-orbitron" style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'hsl(var(--text-muted))' }}>
              CARGANDO...
            </p>
          </div>
        ) : list.length === 0 ? (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', borderStyle: 'dashed' }}>
            <p className="font-orbitron" style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'hsl(var(--text-muted))' }}>
              {tab === 'activos' ? 'NO HAY TORNEOS ACTIVOS' : 'SIN TORNEOS EN HISTORIAL'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {list.map((t, i) => (
              <>
                <TournamentCard key={t.id} tournament={t} />
                {(i === 2 || (i > 2 && (i - 2) % 6 === 0)) && (
                  <AdZone key={`ad-${i}`} position="between_tournaments" />
                )}
              </>
            ))}
          </div>
        )}

        {tab === 'historial' && historial.length > 0 && (
          <p style={{ marginTop: '2rem', textAlign: 'center', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', letterSpacing: '0.05em' }}>
            Los torneos finalizados se eliminan automáticamente a los 30 días.
          </p>
        )}
      </div>
    </main>
  )
}

function TournamentCard({ tournament }: { tournament: any }) {
  const isActive   = tournament.status === 'active'
  const isFinished = tournament.status === 'finished'
  const statusLabel = isActive ? '● EN VIVO' : isFinished ? 'FINALIZADO' : 'PRE-TORNEO'
  const statusColor = isActive ? '#10b981' : isFinished ? '#6b7280' : 'hsl(var(--text-muted))'

  return (
    <Link href={`/tournaments/${tournament.slug}`} style={{ textDecoration: 'none' }}>
      <div
        className="glass-panel"
        style={{
          display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem',
          transition: 'border-color 200ms ease-out',
          opacity: isFinished ? 0.75 : 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-orbitron" style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: statusColor }}>
            {statusLabel}
          </span>
          {tournament.arena_betting_status === 'open' && (
            <span style={{ fontSize: '0.6rem', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.08em', color: '#00F5FF', border: '1px solid rgba(0,245,255,0.3)', padding: '0.15rem 0.5rem', borderRadius: '3px' }}>
              APUESTAS ABIERTAS
            </span>
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
          <span className="font-orbitron" style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: isFinished ? 'hsl(var(--text-muted))' : '#00F5FF' }}>
            {isFinished ? 'VER HISTORIAL →' : 'VER DETALLES →'}
          </span>
        </div>
      </div>
    </Link>
  )
}
