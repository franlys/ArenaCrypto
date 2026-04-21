'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getUserExternalBets } from '@/lib/actions/sports-betting'
import styles from './mybets.module.css'

type BetStatus = 'pending' | 'won' | 'lost' | 'paid' | 'refunded'
type FilterTab  = 'all' | 'active' | 'won' | 'lost'

interface Bet {
  id:         string
  pick_name:  string
  amount:     number
  is_test:    boolean
  status:     BetStatus
  created_at: string
  external_bet_markets: {
    external_home_team:  string
    external_away_team:  string
    external_tournament: string
    external_sport:      string
    starts_at:           string
    winner_name:         string | null
    home_score:          number | null
    away_score:          number | null
  } | null
}

const STATUS_LABEL: Record<BetStatus, string> = {
  pending: 'ACTIVA',
  won:     'GANADA',
  lost:    'PERDIDA',
  paid:    'COBRADA',
  refunded:'DEVUELTA',
}

const STATUS_COLOR: Record<BetStatus, string> = {
  pending: 'rgba(251,191,36,0.8)',
  won:     '#00F5FF',
  lost:    'rgba(239,68,68,0.6)',
  paid:    '#22c55e',
  refunded:'rgba(255,255,255,0.35)',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MisApuestasPage() {
  const [bets, setBets]     = useState<Bet[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserExternalBets().then(res => {
      if ('data' in res) setBets(res.data as unknown as Bet[])
      setLoading(false)
    })
  }, [])

  const filtered = bets.filter(b => {
    if (filter === 'active') return b.status === 'pending'
    if (filter === 'won')    return b.status === 'won' || b.status === 'paid'
    if (filter === 'lost')   return b.status === 'lost'
    return true
  })

  const totalWagered = bets.reduce((s, b) => s + Number(b.amount), 0)
  const totalWon     = bets.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.amount) * 1.6, 0)
  const inPlay       = bets.filter(b => b.status === 'pending').reduce((s, b) => s + Number(b.amount), 0)

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',    label: 'TODO' },
    { key: 'active', label: 'ACTIVAS' },
    { key: 'won',    label: 'GANADAS' },
    { key: 'lost',   label: 'PERDIDAS' },
  ]

  return (
    <div className={styles.page}>
      {/* Header */}
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.23,1,0.32,1] }}
      >
        <div>
          <Link href="/arena/sport" className={styles.backLink}>← Arena Sport</Link>
          <h1 className={`font-orbitron ${styles.title}`}>Mis Apuestas</h1>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        {[
          { label: 'Total apostado', value: `$${totalWagered.toFixed(2)}`, color: 'rgba(255,255,255,0.6)' },
          { label: 'En juego',       value: `$${inPlay.toFixed(2)}`,       color: 'rgba(251,191,36,0.8)' },
          { label: 'Ganado',         value: `$${totalWon.toFixed(2)}`,     color: '#00F5FF' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            className={styles.statCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <p className={styles.statLabel}>{s.label}</p>
            <p className={`font-orbitron ${styles.statValue}`} style={{ color: s.color }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${filter === t.key ? styles.tabActive : ''}`}
            onClick={() => setFilter(t.key)}
          >
            <span className="font-orbitron" style={{ fontSize: '0.52rem', letterSpacing: '0.12em' }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Bet list */}
      {loading ? (
        <div className={styles.loading}>
          <span className={styles.spinner} />
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <p className="font-orbitron" style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.15)' }}>
            SIN APUESTAS
          </p>
        </div>
      ) : (
        <div className={styles.betList}>
          {filtered.map((bet, i) => {
            const mkt = bet.external_bet_markets
            return (
              <motion.div
                key={bet.id}
                className={styles.betRow}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                {/* Status pill */}
                <div className={styles.betStatus} style={{ color: STATUS_COLOR[bet.status], borderColor: STATUS_COLOR[bet.status] + '33' }}>
                  {STATUS_LABEL[bet.status]}
                  {bet.is_test && <span className={styles.testTag}>TEST</span>}
                </div>

                {/* Match info */}
                <div className={styles.betMain}>
                  <p className={styles.betMatch}>
                    {mkt ? `${mkt.external_home_team} vs ${mkt.external_away_team}` : '—'}
                  </p>
                  <p className={styles.betLeague}>{mkt?.external_tournament ?? ''}</p>
                </div>

                {/* Pick + amount */}
                <div className={styles.betRight}>
                  <p className={styles.betPick}>{bet.pick_name === 'draw' ? 'EMPATE' : bet.pick_name.slice(0, 10)}</p>
                  <p className={`font-orbitron ${styles.betAmount}`}>${Number(bet.amount).toFixed(2)}</p>
                  <p className={styles.betDate}>{formatDate(bet.created_at)}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
