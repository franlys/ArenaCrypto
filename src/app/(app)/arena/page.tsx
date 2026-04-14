"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import styles from "./arena.module.css";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const MODES = [
  { id: "1v1 Ranked", label: "1v1 RANKED",    desc: "Clasificatorio oficial. Rating en juego.",  icon: "⚔️",  hot: true  },
  { id: "1v1 Cash",   label: "1v1 CASH",       desc: "Apuesta libre sin impacto en rating.",      icon: "💰",  hot: false },
  { id: "2v2",        label: "2v2 SQUAD",      desc: "Forma equipo con un compañero.",            icon: "🛡️",  hot: false },
  { id: "Tournament", label: "TORNEO",         desc: "Bracket eliminatorio. Próximamente.",       icon: "🏆",  hot: false, disabled: true },
];

export default function ArenaPage() {
  return (
    <div className={styles.page}>
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <h1 className={`font-orbitron ${styles.title}`}>
          La <span className="neon-text-cyan">Arena</span>
        </h1>
        <p className={styles.subtitle}>
          Elige tu modalidad de combate y encuentra un rival.
        </p>
      </motion.header>

      <div className={styles.modesGrid}>
        {MODES.map((mode, i) => (
          <motion.div
            key={mode.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 + i * 0.07, ease: EASE_OUT }}
          >
            {mode.disabled ? (
              <div className={`glass-panel ${styles.modeCard} ${styles.modeDisabled}`}>
                <span className={styles.modeIcon}>{mode.icon}</span>
                <div>
                  <h3 className={`font-orbitron ${styles.modeLabel}`}>{mode.label}</h3>
                  <p className={styles.modeDesc}>{mode.desc}</p>
                </div>
                <span className={styles.badgeSoon}>PRONTO</span>
              </div>
            ) : (
              <Link href="/dashboard" className={`glass-panel ${styles.modeCard} ${styles.modeActive}`}>
                <span className={styles.modeIcon}>{mode.icon}</span>
                <div>
                  <h3 className={`font-orbitron ${styles.modeLabel}`}>{mode.label}</h3>
                  <p className={styles.modeDesc}>{mode.desc}</p>
                </div>
                {mode.hot && <span className={styles.badgeHot}>EN VIVO</span>}
                <span className={styles.arrow}>→</span>
              </Link>
            )}
          </motion.div>
        ))}
      </div>

      {/* Live activity bar */}
      <motion.div
        className={`glass-panel ${styles.activityBar}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <div className={styles.activityItem}>
          <span className={styles.activityDot} />
          <span className={styles.activityLabel}>JUGADORES EN COLA</span>
          <span className={`font-orbitron ${styles.activityValue}`}>—</span>
        </div>
        <div className={styles.activityDivider} />
        <div className={styles.activityItem}>
          <span className={styles.activityLabel}>PARTIDAS ACTIVAS</span>
          <span className={`font-orbitron ${styles.activityValue}`}>—</span>
        </div>
        <div className={styles.activityDivider} />
        <div className={styles.activityItem}>
          <span className={styles.activityLabel}>BOLSA TOTAL HOY</span>
          <span className={`font-orbitron ${styles.activityValue} neon-text-cyan`}>$0 USDC</span>
        </div>
      </motion.div>
    </div>
  );
}
