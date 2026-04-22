'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import styles from './dice.module.css'

const HOUSE_EDGE = 0.08
const QUICK      = [1, 5, 10, 25]

interface RollResult {
  result: number
  won: boolean
  multiplier: number
  payout: number
}

interface HistoryEntry extends RollResult {
  amount: number
  target: number
  direction: 'over' | 'under'
}

function calcMultiplier(target: number, direction: 'over' | 'under'): number {
  const winChance = direction === 'over' ? (99 - target) / 100 : (target - 1) / 100
  if (winChance <= 0) return 0
  return Math.floor(((1 - HOUSE_EDGE) / winChance) * 100) / 100
}

function winChancePct(target: number, direction: 'over' | 'under'): number {
  return direction === 'over' ? 99 - target : target - 1
}

export function DiceGame() {
  const { profile, isTestUser, refreshProfile } = useUser()
  const [amount, setAmount]         = useState('')
  const [target, setTarget]         = useState(50)
  const [direction, setDirection]   = useState<'over' | 'under'>('over')
  const [isTest, setIsTest]         = useState(isTestUser)
  const [rolling, setRolling]       = useState(false)
  const [result, setResult]         = useState<RollResult | null>(null)
  const [history, setHistory]       = useState<HistoryEntry[]>([])
  const [showResult, setShowResult] = useState(false)

  const balance     = Number(profile?.wallets?.balance_stablecoin ?? 0)
  const testBalance = Number(profile?.wallets?.test_balance        ?? 0)
  const activeBalance = isTest ? testBalance : balance

  const multiplier  = calcMultiplier(target, direction)
  const winChance   = winChancePct(target, direction)
  const numAmount   = parseFloat(amount) || 0
  const potentialWin = numAmount > 0 ? Math.floor(numAmount * multiplier * 100) / 100 : 0
  const canRoll     = numAmount >= 0.5 && numAmount <= activeBalance

  const handleRoll = useCallback(async () => {
    if (!canRoll || rolling) return
    setRolling(true)
    setShowResult(false)

    try {
      const res = await fetch('/api/games/dice/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, target, direction, isTest }),
      })
      const data = await res.json()

      if (data.result !== undefined) {
        setResult(data)
        setShowResult(true)
        setHistory(prev => [{ ...data, amount: numAmount, target, direction }, ...prev.slice(0, 9)])
        refreshProfile()
      }
    } finally {
      setRolling(false)
    }
  }, [canRoll, rolling, numAmount, target, direction, isTest, refreshProfile])

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <Link href="/arena/games" className={styles.backLink}>← Arena Games</Link>
          <h1 className={`font-orbitron ${styles.title}`}>
            DICE <span style={{ color: 'hsl(var(--neon-purple))', fontSize: '0.55em' }}>◈</span>
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

      <div className={styles.main}>
        {/* Game panel */}
        <div className={styles.gamePanel}>
          {/* Result display */}
          <div className={`${styles.resultDisplay} ${showResult && result ? (result.won ? styles.resultWon : styles.resultLost) : ''}`}>
            <AnimatePresence mode="wait">
              {showResult && result ? (
                <motion.div key={result.result} className={styles.resultInner}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                >
                  <p className={styles.resultNum}>{result.result}</p>
                  <p className={styles.resultVerdict} style={{ color: result.won ? '#22c55e' : '#ef4444' }}>
                    {result.won ? `✓ +$${result.payout.toFixed(2)}` : '✗ PERDISTE'}
                  </p>
                </motion.div>
              ) : (
                <motion.div key="idle" className={styles.resultIdle}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className={styles.resultIdleNum}>?</p>
                  <p className={styles.resultIdleHint}>Tira los dados</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Direction toggle */}
          <div className={styles.directionRow}>
            <button
              className={`${styles.dirBtn} ${direction === 'under' ? styles.dirActive : ''}`}
              onClick={() => setDirection('under')}
            >
              UNDER
            </button>
            <button
              className={`${styles.dirBtn} ${direction === 'over' ? styles.dirActive : ''}`}
              onClick={() => setDirection('over')}
            >
              OVER
            </button>
          </div>

          {/* Slider */}
          <div className={styles.sliderWrap}>
            <input
              type="range" min="2" max="98" value={target}
              onChange={e => setTarget(parseInt(e.target.value))}
              className={styles.slider}
            />
            <div className={styles.sliderLabels}>
              <span>2</span>
              <span className={styles.sliderTarget}>{target}</span>
              <span>98</span>
            </div>
          </div>

          {/* Stats row */}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <p className={styles.statLabel}>PROB.</p>
              <p className={styles.statVal}>{winChance}%</p>
            </div>
            <div className={styles.statItem}>
              <p className={styles.statLabel}>MULT.</p>
              <p className={`${styles.statVal} ${styles.statHighlight}`}>{multiplier}x</p>
            </div>
            <div className={styles.statItem}>
              <p className={styles.statLabel}>GANANCIA</p>
              <p className={styles.statVal} style={{ color: potentialWin > 0 ? '#22c55e' : undefined }}>
                {potentialWin > 0 ? `$${potentialWin.toFixed(2)}` : '—'}
              </p>
            </div>
          </div>

          {/* Amount */}
          <p className={styles.panelLabel}>MONTO</p>
          <div className={styles.inputRow}>
            <span className={styles.inputPre}>$</span>
            <input
              type="number" min="0.5" step="0.5"
              value={amount} onChange={e => setAmount(e.target.value)}
              className={styles.amountInput} placeholder="0.00"
            />
          </div>
          <div className={styles.quickRow}>
            {QUICK.map(v => (
              <button key={v}
                className={`${styles.quickBtn} ${numAmount === v ? styles.quickActive : ''}`}
                onClick={() => setAmount(String(v))} disabled={v > activeBalance}
              >${v}</button>
            ))}
          </div>

          <button
            className={`${styles.ctaBtn} ${!canRoll ? styles.ctaDisabled : ''}`}
            onClick={handleRoll}
            disabled={!canRoll || rolling}
          >
            {rolling ? <span className={styles.spinner} /> : 'TIRAR DADOS'}
          </button>
        </div>

        {/* History */}
        <div className={styles.historyPanel}>
          <p className={styles.panelLabel}>ÚLTIMAS TIRADAS</p>
          {history.length === 0 ? (
            <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.15)', padding: '0.5rem 0' }}>
              Sin historial aún
            </p>
          ) : (
            <div className={styles.historyList}>
              {history.map((h, i) => (
                <motion.div key={i} className={`${styles.histRow} ${h.won ? styles.histWon : styles.histLost}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className={styles.histResult}>{h.result}</span>
                  <span className={styles.histDesc}>
                    {h.direction === 'over' ? '>' : '<'}{h.target}
                  </span>
                  <span className={styles.histMult}>{h.multiplier}x</span>
                  <span className={styles.histPayout} style={{ color: h.won ? '#22c55e' : 'rgba(239,68,68,0.7)' }}>
                    {h.won ? `+$${h.payout.toFixed(2)}` : `-$${h.amount.toFixed(2)}`}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
