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
  marketType:     string
}

interface MarketSection {
  marketType: string
  label:      string
  picks:      { key: string; label: string }[]
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
  activePick?:    MatchPick | null
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
  return isToday
    ? `Hoy · ${timeStr}`
    : `${d.toLocaleDateString('es-VE', { month: 'short', day: 'numeric' })} · ${timeStr}`
}

function buildSections(sport: string, homeTeam: string, awayTeam: string): MarketSection[] {
  if (sport === 'football') {
    return [
      {
        marketType: 'match_winner',
        label: 'GANADOR',
        picks: [
          { key: homeTeam, label: 'LOCAL' },
          { key: 'draw',   label: 'EMPATE' },
          { key: awayTeam, label: 'VISITA' },
        ],
      },
      {
        marketType: 'both_teams_score',
        label: 'AMBOS ANOTAN',
        picks: [
          { key: 'yes', label: 'SÍ' },
          { key: 'no',  label: 'NO' },
        ],
      },
      {
        marketType: 'over_under_2_5',
        label: 'GOLES TOTALES',
        picks: [
          { key: 'over',  label: '+2.5' },
          { key: 'under', label: '-2.5' },
        ],
      },
    ]
  }
  // basketball, baseball — no draw
  return [
    {
      marketType: 'match_winner',
      label: 'GANADOR',
      picks: [
        { key: homeTeam, label: 'LOCAL' },
        { key: awayTeam, label: 'VISITA' },
      ],
    },
  ]
}

export function MatchCard({
  eventId, sport, league, homeTeam, awayTeam, startTimestamp,
  isLive, homeScore, awayScore, activePick, onPickSelect, index = 0,
}: MatchCardProps) {
  const sections = buildSections(sport, homeTeam, awayTeam)

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

      {/* Market sections */}
      {!isLive ? (
        <div className={styles.markets}>
          {sections.map(section => (
            <div key={section.marketType} className={styles.marketSection}>
              <span className={styles.marketLabel}>{section.label}</span>
              <div className={`${styles.picksRow} ${section.picks.length === 2 ? styles.picksRow2 : ''}`}>
                {section.picks.map(p => {
                  const isActive =
                    activePick?.marketType === section.marketType &&
                    activePick?.pickName   === p.key
                  return (
                    <button
                      key={p.key}
                      className={`${styles.pickBtn} ${isActive ? styles.pickActive : ''}`}
                      onClick={() => onPickSelect({
                        eventId, sport, league, homeTeam, awayTeam,
                        startTimestamp, pickName: p.key, marketType: section.marketType,
                      })}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.liveFooter}>
          <span className={styles.liveLabel}>EN VIVO · APUESTAS CERRADAS</span>
        </div>
      )}
    </motion.div>
  )
}
