'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
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
  const [amount, setAmount]   = useState('')
  const [isTest, setIsTest]   = useState(isTestUser)
  const [loading, setLoading] = useState(false)

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
        amount:         numAmount,
        isTest,
      })
      if ('error' in res) {
        toast.error(res.error)
      } else {
        toast.success('✅ Apuesta registrada')
        setAmount('')
        onBetPlaced()
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  const pickLabel = pick
    ? pick.pickName === 'draw'
      ? 'EMPATE'
      : pick.pickName === pick.homeTeam
        ? `LOCAL · ${pick.homeTeam}`
        : `VISITA · ${pick.awayTeam}`
    : ''

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
