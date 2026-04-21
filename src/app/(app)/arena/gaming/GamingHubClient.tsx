'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import { BetSlip } from '@/components/Sports/BetSlip'
import type { MatchPick } from '@/components/Sports/MatchCard'
import type { PandaMatch } from '@/lib/pandascore'
import styles from './gaming.module.css'

const GAME_ICONS: Record<string, string> = {
  'league-of-legends': '🎮',
  'cs-go':   '🔫',
  'valorant': '⚡',
  'dota-2':   '🛡️',
  'pubg':     '🏆',
  default:    '🎮',
}

function gameIcon(slug: string) {
  return GAME_ICONS[slug] ?? GAME_ICONS.default
}

function GamingMatchCard({
  match,
  activePick,
  onPickSelect,
  index = 0,
}: {
  match: PandaMatch
  activePick?: string | null
  onPickSelect: (pick: MatchPick) => void
  index?: number
}) {
  const homeOp  = match.opponents[0]?.opponent
  const awayOp  = match.opponents[1]?.opponent
  const isLive  = match.status === 'running'
  const homePts = match.results[0]?.score ?? 0
  const awayPts = match.results[1]?.score ?? 0

  if (!homeOp || !awayOp) return null

  const picks: { key: string; label: string }[] = [
    { key: homeOp.name, label: homeOp.name.slice(0, 6).toUpperCase() },
    { key: awayOp.name, label: awayOp.name.slice(0, 6).toUpperCase() },
  ]

  const startTs = match.begin_at ? Math.floor(new Date(match.begin_at).getTime() / 1000) : 0

  return (
    <motion.div
      className={`${styles.matchCard} ${isLive ? styles.matchLive : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.23,1,0.32,1] }}
    >
      {/* Game + league */}
      <div className={styles.matchHeader}>
        <span className={styles.gameIcon}>{gameIcon(match.videogame.slug)}</span>
        <span className={styles.matchLeague}>{match.league.name} · {match.serie.full_name}</span>
        {isLive && (
          <motion.span
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.3, repeat: Infinity }}
            className={styles.liveDot}
          />
        )}
      </div>

      {/* Teams */}
      <div className={styles.matchTeams}>
        <div className={styles.matchTeam}>
          {homeOp.image_url && (
            <img src={homeOp.image_url} alt={homeOp.name} className={styles.teamLogo} />
          )}
          <span className={styles.matchTeamName}>{homeOp.name}</span>
        </div>

        {isLive ? (
          <div className={styles.matchScore}>
            <span>{homePts}</span>
            <span className={styles.scoreSep}>:</span>
            <span>{awayPts}</span>
          </div>
        ) : (
          <span className={styles.vsLabel}>VS</span>
        )}

        <div className={`${styles.matchTeam} ${styles.matchTeamRight}`}>
          {awayOp.image_url && (
            <img src={awayOp.image_url} alt={awayOp.name} className={styles.teamLogo} />
          )}
          <span className={styles.matchTeamName}>{awayOp.name}</span>
        </div>
      </div>

      {/* Picks or live label */}
      {!isLive ? (
        <div className={styles.matchPicks}>
          {picks.map(p => (
            <button
              key={p.key}
              className={`${styles.pickBtn} ${activePick === p.key ? styles.pickActive : ''}`}
              onClick={() => onPickSelect({
                eventId:        `panda-${match.id}`,
                sport:          match.videogame.slug,
                league:         `${match.league.name} · ${match.serie.full_name}`,
                homeTeam:       homeOp.name,
                awayTeam:       awayOp.name,
                startTimestamp: startTs,
                pickName:       p.key,
              })}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : (
        <p className={styles.liveLabel}>EN VIVO · APUESTAS CERRADAS</p>
      )}
    </motion.div>
  )
}

export function GamingHubClient({ live, upcoming }: { live: PandaMatch[]; upcoming: PandaMatch[] }) {
  const { profile, isTestUser, refreshProfile } = useUser()
  const [activePick, setActivePick] = useState<MatchPick | null>(null)
  const [betSlipOpen, setBetSlipOpen] = useState(false)

  const balance     = Number(profile?.wallets?.balance_stablecoin ?? 0)
  const testBalance = Number(profile?.wallets?.test_balance        ?? 0)

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
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.23,1,0.32,1] }}
        >
          <div>
            <h1 className={`font-orbitron ${styles.title}`}>
              Arena <span className="neon-text-purple">Gaming</span>
            </h1>
            <p className={styles.subtitle}>eSports Pro · LoL · CS2 · Valorant · Dota 2</p>
          </div>
          <Link href="/arena/sport/mis-apuestas" className={styles.myBetsLink}>
            Mis apuestas →
          </Link>
        </motion.div>

        {/* Live matches */}
        {live.length > 0 && (
          <section className={styles.liveSection}>
            <div className={styles.liveSectionHeader}>
              <motion.span
                animate={{ opacity: [1,0.25,1] }}
                transition={{ duration: 1.3, repeat: Infinity }}
                className={styles.liveDotLg}
              />
              <span className="font-orbitron" style={{ fontSize: '0.58rem', letterSpacing: '0.25em', color: '#ef4444' }}>
                EN VIVO
              </span>
            </div>
            <div className={styles.liveGrid}>
              {live.map((m, i) => (
                <GamingMatchCard key={m.id} match={m} onPickSelect={handlePickSelect} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming */}
        <section>
          <p className="font-orbitron" style={{ fontSize: '0.58rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', marginBottom: '1rem' }}>
            PRÓXIMOS PARTIDOS
          </p>
          {upcoming.length > 0 ? (
            <div className={styles.grid}>
              {upcoming.map((m, i) => (
                <GamingMatchCard
                  key={m.id}
                  match={m}
                  activePick={activePick?.eventId === `panda-${m.id}` ? activePick.pickName : null}
                  onPickSelect={handlePickSelect}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p className="font-orbitron" style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.15)' }}>
                SIN PARTIDOS DISPONIBLES
              </p>
            </div>
          )}
        </section>
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
