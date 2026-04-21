'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import { supabase } from '@/lib/supabase'
import styles from './crash.module.css'

const QUICK   = [1, 5, 10, 25]
const CRASH_K = 0.00006

interface Bet {
  amount:    number
  isTest:    boolean
  cashoutAt: number | null
  payout:    number | null
  status:    'active' | 'won' | 'lost'
}

interface State {
  roundId:        string | null
  phase:          'betting' | 'running' | 'crashed'
  multiplier:     number
  crashPoint?:    number
  startedAt:      number | null
  timeUntilStart: number
  bets:           Bet[]
}

export function CrashGame() {
  const { profile, isTestUser, refreshProfile } = useUser()
  const [state, setState]         = useState<State | null>(null)
  const [amount, setAmount]       = useState('')
  const [autoCashout, setAuto]    = useState('')
  const [isTest, setIsTest]       = useState(isTestUser)
  const [betting, setBetting]     = useState(false)
  const [cashingOut, setCashing]  = useState(false)
  const [betError, setBetError]   = useState('')
  const [myRoundId, setMyRoundId] = useState<string | null>(null)
  const [liveMult, setLiveMult]   = useState(1.00)
  const [localCountdown, setLocalCountdown] = useState(0)

  // Refs always hold the latest values — avoids stale closures in rAF / intervals
  const stateRef        = useRef<State | null>(null)
  const startedAtRef    = useRef<number | null>(null)
  const roundStartsAtRef = useRef<number | null>(null)
  const animRef         = useRef<number | null>(null)

  const balance       = Number(profile?.wallets?.balance_stablecoin ?? 0)
  const testBalance   = Number(profile?.wallets?.test_balance        ?? 0)
  const activeBalance = isTest ? testBalance : balance

  // ── Polling 200ms non-blocking ──────────────────────────────────────────────
  useEffect(() => {
    let inflight = false

    async function poll() {
      if (inflight) return
      inflight = true
      try {
        const res = await fetch('/api/games/crash/state', { cache: 'no-store' })
        if (res.ok) {
          const data: State = await res.json()
          setState(data)
          stateRef.current = data
          if (data.phase === 'running' && data.startedAt) {
            startedAtRef.current = data.startedAt
          }
          if (data.phase === 'betting' && data.timeUntilStart > 0) {
            roundStartsAtRef.current = Date.now() + data.timeUntilStart
          }
        }
      } catch { /* ignore network errors */ }
      finally { inflight = false }
    }

    poll()
    const id = setInterval(poll, 200)
    return () => clearInterval(id)
  }, [])

  // ── Supabase Realtime — instant round change notification ───────────────────
  useEffect(() => {
    const channel = supabase
      .channel('crash-rounds-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crash_rounds' },
        async () => {
          try {
            const res = await fetch('/api/games/crash/state', { cache: 'no-store' })
            if (res.ok) {
              const data: State = await res.json()
              setState(data)
              stateRef.current = data
              if (data.phase === 'running' && data.startedAt) startedAtRef.current = data.startedAt
              if (data.phase === 'betting' && data.timeUntilStart > 0) {
                roundStartsAtRef.current = Date.now() + data.timeUntilStart
              }
            }
          } catch { /* ignore */ }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Always-running rAF — reads refs, no stale closures ─────────────────────
  useEffect(() => {
    const tick = () => {
      const s = stateRef.current
      if (s?.phase === 'running' && startedAtRef.current) {
        const elapsed = Date.now() - startedAtRef.current
        setLiveMult(Math.round(Math.exp(CRASH_K * elapsed) * 100) / 100)
      } else if (s?.phase === 'crashed') {
        setLiveMult(s.crashPoint ?? s.multiplier)
      } else if (s?.phase === 'betting') {
        setLiveMult(1.00)
      }
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  // ── Countdown ticker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (state?.phase !== 'betting') { setLocalCountdown(0); return }
    const id = setInterval(() => {
      const remaining = roundStartsAtRef.current
        ? Math.max(0, roundStartsAtRef.current - Date.now())
        : 0
      setLocalCountdown(Math.ceil(remaining / 1000))
    }, 100)
    return () => clearInterval(id)
  }, [state?.phase])

  // ── Bet handler ─────────────────────────────────────────────────────────────
  const handleBet = useCallback(async () => {
    const num = parseFloat(amount)
    if (!num || num < 0.5 || num > activeBalance) return
    setBetting(true)
    setBetError('')
    try {
      const res = await fetch('/api/games/crash/bet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: num, isTest, autoCashout: autoCashout ? parseFloat(autoCashout) : null }),
      })
      const data = await res.json()
      if (data.ok) {
        setMyRoundId(data.roundId)
        refreshProfile()
      } else {
        setBetError(data.error ?? 'Error al apostar')
      }
    } finally {
      setBetting(false)
    }
  }, [amount, isTest, autoCashout, activeBalance, refreshProfile])

  // ── Cashout handler ─────────────────────────────────────────────────────────
  const handleCashout = useCallback(async () => {
    if (!state?.roundId) return
    setCashing(true)
    try {
      const res = await fetch('/api/games/crash/cashout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roundId: state.roundId }),
      })
      const data = await res.json()
      if (data.ok) { setMyRoundId(null); refreshProfile() }
    } finally {
      setCashing(false)
    }
  }, [state?.roundId, refreshProfile])

  const hasActiveBet = myRoundId !== null && myRoundId === state?.roundId && state?.phase === 'running'
  const canBet       = state?.phase === 'betting'
    && parseFloat(amount) >= 0.5
    && parseFloat(amount) <= activeBalance
    && myRoundId !== state?.roundId

  const multColor =
    state?.phase === 'crashed' ? '#ef4444' :
    state?.phase === 'running' ? (liveMult >= 2 ? '#22c55e' : '#00F5FF') :
    'rgba(255,255,255,0.5)'

  const countdown = localCountdown

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <Link href="/arena/games" className={styles.backLink}>← Arena Games</Link>
          <h1 className={`font-orbitron ${styles.title}`}>
            CRASH <span style={{ color: '#00F5FF', fontSize: '0.55em', letterSpacing: '0.05em' }}>↑</span>
          </h1>
        </div>
        <div className={styles.balanceRow}>
          <button className={`${styles.modeBtn} ${!isTest ? styles.modeBtnActive : ''}`} onClick={() => setIsTest(false)}>
            REAL <span>${balance.toFixed(2)}</span>
          </button>
          <button className={`${styles.modeBtn} ${isTest ? styles.modeBtnActive : ''}`} onClick={() => setIsTest(true)}>
            TEST <span>${testBalance.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* Crash display */}
      <div className={`${styles.crashDisplay} ${state?.phase === 'crashed' ? styles.crashed : state?.phase === 'running' ? styles.running : ''}`}>
        <AnimatePresence mode="wait">
          {!state ? (
            <motion.div key="loading" className={styles.bettingPhase}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className={styles.phaseLabel}>CONECTANDO…</p>
            </motion.div>
          ) : state.phase === 'betting' ? (
            <motion.div key="betting" className={styles.bettingPhase}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className={styles.phaseLabel}>APOSTANDO</p>
              <div className={styles.countdownRing}>
                <motion.div
                  className={styles.countdownPulse}
                  animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.p
                  className={styles.countdown}
                  key={countdown}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {countdown > 0 ? countdown : '…'}
                </motion.p>
              </div>
              <p className={styles.phaseHint}>
                {countdown > 0 ? `La ronda inicia en ${countdown}s` : 'Iniciando…'}
              </p>
            </motion.div>
          ) : state.phase === 'crashed' ? (
            <motion.div key="crashed" className={styles.crashedPhase}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <p className={styles.crashedLabel}>EXPLOTÓ</p>
              <p className={styles.crashedMult} style={{ color: '#ef4444' }}>
                {liveMult.toFixed(2)}x
              </p>
            </motion.div>
          ) : (
            <motion.div key="running" className={styles.runningPhase}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className={styles.phaseLabel} style={{ color: '#22c55e' }}>EN CURSO</p>
              <motion.p
                className={styles.liveMult}
                style={{ color: multColor }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                {liveMult.toFixed(2)}x
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.main}>
        {/* Bet panel */}
        <div className={styles.betPanel}>
          <p className={styles.panelLabel}>MONTO</p>
          <div className={styles.inputRow}>
            <span className={styles.inputPre}>$</span>
            <input
              type="number" min="0.5" step="0.5"
              value={amount} onChange={e => { setAmount(e.target.value); setBetError('') }}
              className={styles.amountInput} placeholder="0.00"
              disabled={state?.phase !== 'betting'}
            />
          </div>
          <div className={styles.quickRow}>
            {QUICK.map(v => (
              <button key={v} className={`${styles.quickBtn} ${parseFloat(amount) === v ? styles.quickActive : ''}`}
                onClick={() => setAmount(String(v))} disabled={v > activeBalance || state?.phase !== 'betting'}>
                ${v}
              </button>
            ))}
          </div>

          <p className={styles.panelLabel} style={{ marginTop: '0.75rem' }}>AUTO COBRAR (opcional)</p>
          <div className={styles.inputRow}>
            <input
              type="number" min="1.1" step="0.1"
              value={autoCashout} onChange={e => setAuto(e.target.value)}
              className={styles.amountInput} placeholder="ej. 2.00"
              disabled={state?.phase !== 'betting'}
            />
            <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', paddingLeft: '0.5rem' }}>x</span>
          </div>

          {betError && (
            <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem' }}>
              {betError}
            </p>
          )}

          <button
            className={`${styles.ctaBtn} ${hasActiveBet ? styles.ctaCashout : ''} ${(!canBet && !hasActiveBet) ? styles.ctaDisabled : ''}`}
            onClick={hasActiveBet ? handleCashout : handleBet}
            disabled={(!canBet && !hasActiveBet) || betting || cashingOut}
          >
            {betting || cashingOut ? (
              <span className={styles.spinner} />
            ) : hasActiveBet ? (
              `COBRAR ${liveMult.toFixed(2)}x — $${(parseFloat(amount || '0') * liveMult).toFixed(2)}`
            ) : state?.phase === 'running' ? (
              'EN CURSO — ESPERA LA PRÓXIMA'
            ) : state?.phase === 'crashed' ? (
              'ESPERANDO NUEVA RONDA…'
            ) : (
              'APOSTAR'
            )}
          </button>
        </div>

        {/* Live bets */}
        <div className={styles.betsPanel}>
          <p className={styles.panelLabel}>APUESTAS ({state?.bets.length ?? 0})</p>
          <div className={styles.betsList}>
            {(state?.bets ?? []).length === 0 ? (
              <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.15)', padding: '0.5rem 0' }}>
                Sé el primero en apostar
              </p>
            ) : (
              (state?.bets ?? []).map((b, i) => (
                <div key={i} className={styles.betRow}>
                  <span className={styles.betAmount}>${b.amount.toFixed(2)}</span>
                  {b.isTest && <span className={styles.testTag}>TEST</span>}
                  <span className={`${styles.betStatus} ${b.status === 'won' ? styles.betWon : b.status === 'lost' ? styles.betLost : ''}`}>
                    {b.status === 'won' ? `${b.cashoutAt?.toFixed(2)}x ✓` : b.status === 'lost' ? '💥' : '…'}
                  </span>
                  {b.payout != null && (
                    <span className={styles.betPayout}>${b.payout.toFixed(2)}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
