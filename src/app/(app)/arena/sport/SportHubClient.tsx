'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import { MatchCard } from '@/components/Sports/MatchCard'
import { BetSlip } from '@/components/Sports/BetSlip'
import type { MatchPick } from '@/components/Sports/MatchCard'
import type { SportEvent } from '@/lib/sportapi'
import styles from './sport.module.css'

const TABS = [
  { key: 'football',   label: 'FÚTBOL', icon: '⚽' },
  { key: 'basketball', label: 'NBA',    icon: '🏀' },
  { key: 'baseball',   label: 'MLB',    icon: '⚾' },
]

interface Props {
  eventsBySport: Record<string, SportEvent[]>
  liveBySport:   Record<string, SportEvent[]>
}

export function SportHubClient({ eventsBySport, liveBySport }: Props) {
  const { profile, isTestUser, refreshProfile } = useUser()
  const [activeSport, setActiveSport] = useState('football')
  const [activePick, setActivePick]   = useState<MatchPick | null>(null)
  const [betSlipOpen, setBetSlipOpen] = useState(false)

  const balance     = Number(profile?.wallets?.balance_stablecoin ?? 0)
  const testBalance = Number(profile?.wallets?.test_balance        ?? 0)

  const upcomingEvents = eventsBySport[activeSport] ?? []
  const allLive        = Object.values(liveBySport).flat()

  const handlePickSelect = useCallback((pick: MatchPick) => {
    setActivePick(pick)
    setBetSlipOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setBetSlipOpen(false)
    setTimeout(() => setActivePick(null), 350)
  }, [])

  return (
    <>
      <div className={styles.page}>
        {/* Header */}
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        >
          <div>
            <h1 className={`font-orbitron ${styles.title}`}>
              Arena <span className="neon-text-cyan">Sport</span>
            </h1>
            <p className={styles.subtitle}>Deportes reales · Apuestas pari-mutuel</p>
          </div>
          <Link href="/arena/sport/mis-apuestas" className={styles.myBetsLink}>
            Mis apuestas →
          </Link>
        </motion.div>

        {/* Live banner */}
        {allLive.length > 0 && (
          <motion.section
            className={styles.liveBanner}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className={styles.liveBannerHeader}>
              <motion.span
                className={styles.livePulse}
                animate={{ opacity: [1, 0.25, 1] }}
                transition={{ duration: 1.3, repeat: Infinity }}
              />
              <span className="font-orbitron" style={{ fontSize: '0.58rem', letterSpacing: '0.25em', color: '#ef4444' }}>
                EN VIVO
              </span>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700 }}>
                {allLive.length} partido{allLive.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className={styles.liveScroll}>
              {allLive.map((ev, i) => (
                <MatchCard
                  key={ev.id}
                  eventId={String(ev.id)}
                  sport="football"
                  league={ev.tournament.name}
                  homeTeam={ev.homeTeam.name}
                  awayTeam={ev.awayTeam.name}
                  startTimestamp={ev.startTimestamp}
                  isLive
                  homeScore={ev.homeScore?.current}
                  awayScore={ev.awayScore?.current}
                  onPickSelect={handlePickSelect}
                  index={i}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* Sport tabs */}
        <div className={styles.tabs}>
          {TABS.map(tab => {
            const count = eventsBySport[tab.key]?.length ?? 0
            return (
              <button
                key={tab.key}
                className={`${styles.tab} ${activeSport === tab.key ? styles.tabActive : ''}`}
                onClick={() => setActiveSport(tab.key)}
              >
                <span>{tab.icon}</span>
                <span className="font-orbitron" style={{ fontSize: '0.55rem', letterSpacing: '0.1em' }}>
                  {tab.label}
                </span>
                {count > 0 && <span className={styles.tabCount}>{count}</span>}
              </button>
            )
          })}
        </div>

        {/* Matches grid */}
        {upcomingEvents.length > 0 ? (
          <div className={styles.grid}>
            {upcomingEvents.map((ev, i) => (
              <MatchCard
                key={ev.id}
                eventId={String(ev.id)}
                sport={activeSport}
                league={ev.tournament.name}
                homeTeam={ev.homeTeam.name}
                awayTeam={ev.awayTeam.name}
                startTimestamp={ev.startTimestamp}
                activePick={activePick?.eventId === String(ev.id) ? activePick : null}
                onPickSelect={handlePickSelect}
                index={i}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <p className="font-orbitron" style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)' }}>
              SIN PARTIDOS HOY
            </p>
            <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.8rem', color: 'rgba(255,255,255,0.15)', marginTop: '0.4rem' }}>
              Vuelve más tarde o ejecuta el sync desde el panel admin.
            </p>
          </div>
        )}
      </div>

      <BetSlip
        pick={activePick}
        isOpen={betSlipOpen}
        onClose={handleClose}
        balance={balance}
        testBalance={testBalance}
        isTestUser={isTestUser}
        onBetPlaced={refreshProfile}
      />
    </>
  )
}
