'use client'

import { motion } from 'framer-motion'
import styles from './matchcard.module.css'

export interface MatchPick {
  eventId:        string
  sport:          string
  league:         string
  homeTeam:       string
  awayTeam:       string
  startTimestamp: number
  pickName:       string
}

interface MatchCardProps {
  eventId:        string
  sport:          string
  league:         string
  homeTeam:       string
  awayTeam:       string
  startTimestamp: number
  isLive?:        boolean
  homeScore?:     number
  awayScore?:     number
  activePick?:    string | null
  onPickSelect:   (pick: MatchPick) => void
  index?:         number
}

function TeamAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={styles.teamAvatar}>
      <span className={styles.teamInitials}>{initials}</span>
    </div>
  )
}

function formatKickoff(ts: number): string {
  const d = new Date(ts * 1000)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const timeStr = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
  return isToday ? `Hoy · ${timeStr}` : `${d.toLocaleDateString('es-VE', { month: 'short', day: 'numeric' })} · ${timeStr}`
}

export function MatchCard({
  eventId, sport, league, homeTeam, awayTeam, startTimestamp,
  isLive, homeScore, awayScore, activePick, onPickSelect, index = 0,
}: MatchCardProps) {
  const picks = [
    { key: homeTeam,  label: 'LOCAL' },
    { key: 'draw',    label: 'EMPATE' },
    { key: awayTeam,  label: 'VISIT.' },
  ]

  return (
    <motion.div
      className={`${styles.card} ${isLive ? styles.live : ''}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* League header */}
      <div className={styles.leagueRow}>
        {isLive && (
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className={styles.liveDot}
          />
        )}
        <span className={styles.leagueName}>{league}</span>
        {!isLive && (
          <span className={styles.kickoff}>{formatKickoff(startTimestamp)}</span>
        )}
      </div>

      {/* Teams */}
      <div className={styles.teamsRow}>
        <div className={styles.teamSide}>
          <TeamAvatar name={homeTeam} />
          <span className={styles.teamName}>{homeTeam}</span>
        </div>

        {isLive ? (
          <div className={styles.scoreboard}>
            <span className={styles.score}>{homeScore ?? 0}</span>
            <span className={styles.scoreDash}>:</span>
            <span className={styles.score}>{awayScore ?? 0}</span>
          </div>
        ) : (
          <span className={styles.vsText}>VS</span>
        )}

        <div className={`${styles.teamSide} ${styles.teamSideRight}`}>
          <TeamAvatar name={awayTeam} />
          <span className={styles.teamName}>{awayTeam}</span>
        </div>
      </div>

      {/* Pick buttons — disabled when live */}
      {!isLive && (
        <div className={styles.picksRow}>
          {picks.map(p => (
            <button
              key={p.key}
              className={`${styles.pickBtn} ${activePick === p.key ? styles.pickActive : ''}`}
              onClick={() => onPickSelect({
                eventId, sport, league, homeTeam, awayTeam, startTimestamp,
                pickName: p.key,
              })}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {isLive && (
        <div className={styles.liveFooter}>
          <span className={styles.liveLabel}>EN VIVO · APUESTAS CERRADAS</span>
        </div>
      )}
    </motion.div>
  )
}
