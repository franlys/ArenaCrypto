"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import styles from "./como-funciona.module.css";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const STEPS = [
  {
    num: "01",
    icon: "🔗",
    title: "Conecta tu Wallet",
    desc: "Vincula tu wallet de Polygon (MetaMask u otra compatible). Sin registro clásico — tu wallet es tu identidad en la Arena.",
    detail: "Compatible con MetaMask, WalletConnect, Coinbase Wallet y más.",
  },
  {
    num: "02",
    icon: "💰",
    title: "Deposita Fondos",
    desc: "Transfiere USDC desde tu wallet al balance interno de ArenaCrypto. Las transacciones son instantáneas y sin gas repetido.",
    detail: "Red: Polygon Mainnet · Stablecoin: USDC · Sin volatilidad.",
  },
  {
    num: "03",
    icon: "⚔️",
    title: "Elige tu Partida",
    desc: "Selecciona el videojuego, el modo de juego y la cantidad a apostar. El motor de matchmaking busca un rival con los mismos parámetros.",
    detail: "+35 juegos disponibles: Valorant, CS2, LoL, EA FC, Fortnite y más.",
  },
  {
    num: "04",
    icon: "🤝",
    title: "Confirmación de Combate",
    desc: "Cuando se encuentra un rival, ambos jugadores confirman. Los fondos quedan en escrow seguro — nadie puede retirarlos hasta que el combate se resuelva.",
    detail: "Escrow gestionado on-chain en Polygon. 5% de comisión de la casa.",
  },
  {
    num: "05",
    icon: "🎮",
    title: "Juega en tu Plataforma",
    desc: "El combate ocurre en tu consola o PC como cualquier partida normal. ArenaCrypto no interfiere con el juego — tú y tu rival se coordinan por el chat integrado.",
    detail: "Chat privado en tiempo real disponible durante toda la partida.",
  },
  {
    num: "06",
    icon: "📸",
    title: "Sube tu Evidencia",
    desc: "El ganador sube una captura de pantalla o video del resultado final directamente desde la plataforma.",
    detail: "Formatos aceptados: JPG, PNG, WebP, MP4 · Máximo 50 MB.",
  },
  {
    num: "07",
    icon: "🤖",
    title: "Validación con IA",
    desc: "Gemini Vision analiza la evidencia automáticamente. Si la confianza es ≥ 80%, el ganador se determina al instante y los fondos se liberan.",
    detail: "Si la confianza es baja, un árbitro humano revisa en menos de 24h.",
  },
  {
    num: "08",
    icon: "🏆",
    title: "Cobra tu Premio",
    desc: "Los USDC se acreditan en tu balance Arena al instante. Retíralos a tu wallet cuando quieras.",
    detail: "Premio = apuesta × 2 − 5% comisión de la casa.",
  },
];

const FAQS = [
  {
    q: "¿Es seguro dejar mis fondos en ArenaCrypto?",
    a: "Los fondos en escrow están gestionados on-chain en Polygon. El smart contract garantiza que nadie — incluyendo ArenaCrypto — puede moverlos hasta que el resultado sea validado.",
  },
  {
    q: "¿Qué pasa si hay empate o la IA no puede decidir?",
    a: "Si Gemini detecta baja confianza o ambos jugadores disputan el resultado, el caso pasa a revisión manual. Un árbitro resuelve en menos de 24 horas.",
  },
  {
    q: "¿Qué juegos están disponibles?",
    a: "Cualquier juego donde exista una pantalla de resultados clara. Actualmente soportamos +35 títulos: Valorant, CS2, LoL, EA FC, Fortnite, Apex, Tekken 8 y más.",
  },
  {
    q: "¿Cuánto cobra ArenaCrypto?",
    a: "Una comisión del 5% sobre la apuesta ganada. Si apuestas $10 y ganas, recibes $19 (los $20 del pozo menos $1 de comisión).",
  },
  {
    q: "¿Necesito suscripción Premium?",
    a: "No. La plataforma es gratuita con publicidad. Premium (5 USDC/mes) elimina los anuncios y da acceso prioritario a validación de evidencias.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <motion.header
        className={styles.hero}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
      >
        <h1 className={`font-orbitron ${styles.heroTitle}`}>
          ¿Cómo <span className="neon-text-cyan">Funciona</span>?
        </h1>
        <p className={styles.heroSub}>
          De la wallet al premio — el flujo completo en 8 pasos.
        </p>
      </motion.header>

      {/* ── Steps ── */}
      <div className={styles.stepsGrid}>
        {STEPS.map((step, i) => (
          <motion.div
            key={step.num}
            className={`glass-panel ${styles.stepCard}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 + i * 0.05, ease: EASE_OUT }}
          >
            <div className={styles.stepTop}>
              <span className={`font-orbitron ${styles.stepNum}`}>{step.num}</span>
              <span className={styles.stepIcon}>{step.icon}</span>
            </div>
            <h3 className={`font-orbitron ${styles.stepTitle}`}>{step.title}</h3>
            <p className={styles.stepDesc}>{step.desc}</p>
            <p className={styles.stepDetail}>{step.detail}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Commission breakdown ── */}
      <motion.div
        className={`glass-panel ${styles.commBox}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5, ease: EASE_OUT }}
      >
        <h2 className={`font-orbitron ${styles.commTitle}`}>
          Ejemplo de <span className="neon-text-cyan">Apuesta</span>
        </h2>
        <div className={styles.commGrid}>
          {[
            { label: "Apuesta por jugador", value: "$10 USDC" },
            { label: "Pozo total",          value: "$20 USDC" },
            { label: "Comisión (5%)",       value: "−$1 USDC",  dim: true },
            { label: "Premio al ganador",   value: "$19 USDC",  highlight: true },
          ].map((row) => (
            <div key={row.label} className={styles.commRow}>
              <span className={styles.commLabel}>{row.label}</span>
              <span className={`font-orbitron ${styles.commValue} ${row.highlight ? styles.commHighlight : ""} ${row.dim ? styles.commDim : ""}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── FAQ ── */}
      <motion.section
        className={styles.faqSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <h2 className={`font-orbitron ${styles.faqTitle}`}>Preguntas Frecuentes</h2>
        <div className={styles.faqList}>
          {FAQS.map((faq, i) => (
            <motion.details
              key={i}
              className={`glass-panel ${styles.faqItem}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 + i * 0.04, duration: 0.3, ease: EASE_OUT }}
            >
              <summary className={`font-orbitron ${styles.faqQ}`}>{faq.q}</summary>
              <p className={styles.faqA}>{faq.a}</p>
            </motion.details>
          ))}
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <motion.div
        className={styles.ctaRow}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.4, ease: EASE_OUT }}
      >
        <Link href="/dashboard" className={`btn-primary ${styles.ctaBtn}`}>
          ENTRAR A LA ARENA
        </Link>
        <Link href="/login" className={styles.ctaSecondary}>
          CREAR CUENTA
        </Link>
      </motion.div>
    </div>
  );
}
