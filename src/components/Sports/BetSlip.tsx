'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { placeExternalBet } from '@/lib/actions/sports-betting'
import type { MatchPick } from './MatchCard'
import styles from './betslip.module.css'

const QUICK_AMOUNTS = [5, 10, 25, 50]

interface BetSlipProps {
  pick:     MatchPick | null
  isOpen:   boolean
  onClose:  () => void
  balance:  number
  testBalance: number
  isTestUser:  boolean
  onBetPlaced: () => void
}

export function BetSlip({ pick, isOpen, onClose, balance, testBalance, isTestUser, onBetPlaced }: BetSlipProps) {
  const [amount, setAmount]     = useState('')
  const [isTest, setIsTest]     = useState(isTestUser)
  const [loading, setLoading]   = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const numAmount      = parseFloat(amount) || 0
  const activeBalance  = isTest ? testBalance : balance
  const estimatedPay   = numAmount > 0 ? (numAmount * 1.6).toFixed(2) : '—'
  const canBet         = numAmount >= 1 && numAmount <= activeBalance && pick != null

  async function handleConfirm() {
    if (!pick || !canBet) return
    setLoading(true)
    try {
      const res = await placeExternalBet({
        eventId:        pick.eventId,
        sport:          pick.sport,
        league:         pick.league,
        homeTeam:       pick.homeTeam,
        awayTeam:       pick.awayTeam,
        startTimestamp: pick.startTimestamp,
        pickName:       pick.pickName,
        marketType:     pick.marketType,
        amount:         numAmount,
        isTest,
      })
      if ('error' in res) {
        setFeedback({ ok: false, msg: res.error })
      } else {
        setFeedback({ ok: true, msg: '✅ Apuesta registrada' })
        setAmount('')
        onBetPlaced()
        setTimeout(() => { setFeedback(null); onClose() }, 1400)
      }
    } finally {
      setLoading(false)
    }
  }

  function getPickLabel(p: typeof pick): string {
    if (!p) return ''
    if (p.marketType === 'both_teams_score') return p.pickName === 'yes' ? 'AMBOS ANOTAN · SÍ' : 'AMBOS ANOTAN · NO'
    if (p.marketType === 'over_under_2_5')   return p.pickName === 'over' ? 'GOLES TOTALES · OVER +2.5' : 'GOLES TOTALES · UNDER -2.5'
    if (p.marketType === 'over_under_maps')  return p.pickName === 'over' ? 'MAPAS · OVER +2.5' : 'MAPAS · UNDER -2.5'
    if (p.pickName === 'draw') return 'GANADOR · EMPATE'
    if (p.pickName === p.homeTeam) return `GANADOR · LOCAL`
    return `GANADOR · VISITA`
  }
  const pickLabel = getPickLabel(pick)

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <motion.div
        className={styles.drawer}
        initial={{ x: '100%' }}
        animate={{ x: isOpen ? '0%' : '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 38, mass: 0.9 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div>
            <p className={styles.headerLabel}>SLIP DE APUESTA</p>
            {pick && (
              <p className={styles.headerMatch}>
                {pick.homeTeam} <span>vs</span> {pick.awayTeam}
              </p>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {pick && (
          <div className={styles.body}>
            {/* League + pick */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>{pick.league}</p>
              <div className={styles.pickChip}>
                <span className={styles.pickChipLabel}>Tu pick</span>
                <span className={styles.pickChipValue}>{pickLabel}</span>
              </div>
            </div>

            {/* Balance mode toggle */}
            <div className={styles.section}>
              <div className={styles.modeToggle}>
                <button
                  className={`${styles.modeBtn} ${!isTest ? styles.modeBtnActive : ''}`}
                  onClick={() => setIsTest(false)}
                >
                  REAL <span className={styles.modeBal}>${balance.toFixed(2)}</span>
                </button>
                <button
                  className={`${styles.modeBtn} ${isTest ? styles.modeBtnActive : ''}`}
                  onClick={() => setIsTest(true)}
                >
                  TEST <span className={styles.modeBal}>${testBalance.toFixed(2)}</span>
                </button>
              </div>
              {isTest && (
                <p className={styles.testBadge}>MODO PRUEBA — sin dinero real</p>
              )}
            </div>

            {/* Amount input */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>Monto (USDC)</p>
              <div className={styles.inputWrap}>
                <span className={styles.inputPrefix}>$</span>
                <input
                  type="number"
                  min="1"
                  max={activeBalance}
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className={styles.amountInput}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.quickPills}>
                {QUICK_AMOUNTS.map(v => (
                  <button
                    key={v}
                    className={`${styles.pill} ${numAmount === v ? styles.pillActive : ''}`}
                    onClick={() => setAmount(String(v))}
                    disabled={v > activeBalance}
                  >
                    ${v}
                  </button>
                ))}
              </div>
            </div>

            {/* Payout estimate */}
            <div className={styles.payoutRow}>
              <div className={styles.payoutItem}>
                <span className={styles.payoutLabel}>Apuesta</span>
                <span className={styles.payoutVal}>${numAmount > 0 ? numAmount.toFixed(2) : '—'}</span>
              </div>
              <div className={styles.payoutArrow}>→</div>
              <div className={styles.payoutItem}>
                <span className={styles.payoutLabel}>Retorno est.</span>
                <span className={`${styles.payoutVal} ${styles.payoutGain}`}>${estimatedPay}</span>
              </div>
            </div>

            <p className={styles.payoutNote}>* Retorno pari-mutuel estimado. Varía según el pozo final.</p>

            {/* Feedback */}
            <AnimatePresence>
              {feedback && (
                <motion.p
                  className={feedback.ok ? styles.feedbackOk : styles.feedbackErr}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {feedback.msg}
                </motion.p>
              )}
            </AnimatePresence>

            {/* CTA */}
            <button
              className={`${styles.confirmBtn} ${!canBet ? styles.confirmDisabled : ''}`}
              onClick={handleConfirm}
              disabled={!canBet || loading}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : numAmount < 1 ? (
                'Ingresa un monto'
              ) : numAmount > activeBalance ? (
                'Saldo insuficiente'
              ) : (
                'COLOCAR APUESTA'
              )}
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}
