"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Gamepad2, ShieldCheck, Bot, Zap, Trophy, ChevronRight, TrendingUp } from "lucide-react";
import styles from "./home.module.css";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/* ── Live activity cards floating in hero ─────────────────── */
const LIVE_CARDS = [
  {
    id: 1, pos: "topRight",
    avatar: "XD", user: "xDragon_77",
    game: "VALORANT", result: "GANÓ",
    amount: "+$48 USDC", resultColor: "#10b981",
    delay: 1.1,
  },
  {
    id: 2, pos: "midLeft",
    avatar: "NA", user: "NitroAce",
    game: "CS2", result: "EN VIVO",
    amount: "$25 apostado", resultColor: "#F59E0B",
    delay: 1.9,
  },
  {
    id: 3, pos: "botRight",
    avatar: "SF", user: "ShadowFox",
    game: "FORTNITE", result: "GANÓ",
    amount: "+$18 USDC", resultColor: "#10b981",
    delay: 2.7,
  },
];

/* ── Live ticker data ─────────────────────────────────────── */
const TICKER = [
  { icon: "🏆", text: "xDragon_77 · VALORANT · +$48 USDC" },
  { icon: "⚡", text: "Match encontrado · CS2 · apuesta $25" },
  { icon: "💎", text: "NitroAce ganó Copa Platino · +$200 USDC" },
  { icon: "🎮", text: "ShadowFox vs AimGod · Fortnite · EN VIVO" },
  { icon: "✅", text: "Retiro procesado · CryptoKid · $89 USDC" },
  { icon: "🔥", text: "ProPlayer_X · FIFA 25 · +$12 USDC" },
  { icon: "⚡", text: "Torneo Copa Diamante · 8 jugadores · $400 en premios" },
  { icon: "🏆", text: "AimGod99 · Apex Legends · +$35 USDC" },
];

/* ── Page sections ────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Gamepad2, title: "CUALQUIER JUEGO",
    desc: "Valorant, CS2, FIFA, League of Legends y 35+ títulos. Si tiene ranking, aquí se apuesta.",
    color: "#00F5FF",
  },
  {
    icon: ShieldCheck, title: "CRIPTO SEGURO",
    desc: "Fondos bloqueados en contrato hasta que el árbitro resuelve. Sin intermediarios, sin riesgos.",
    color: "#8B5CF6",
  },
  {
    icon: Bot, title: "IA ÁRBITRO",
    desc: "Gemini 1.5 analiza las evidencias y resuelve en segundos. Sin sesgos, sin favoritismos.",
    color: "#F59E0B",
  },
];

const STEPS = [
  { n: "01", title: "CONECTA", desc: "Wallet Polygon + cuenta en 30 segundos." },
  { n: "02", title: "ELIGE",   desc: "Selecciona juego, modo y apuesta." },
  { n: "03", title: "JUEGA",   desc: "Match automático contra oponente verificado." },
  { n: "04", title: "COBRA",   desc: "El ganador recibe el 99.5% del pozo al instante." },
];

const GAMES = [
  { name: "VALORANT",         tag: "FPS",          color: "rgba(255,70,84,0.15)",   border: "rgba(255,70,84,0.3)" },
  { name: "CS2",              tag: "FPS",          color: "rgba(255,150,0,0.12)",   border: "rgba(255,150,0,0.3)" },
  { name: "FIFA 25",          tag: "SPORTS",       color: "rgba(0,200,80,0.12)",    border: "rgba(0,200,80,0.3)" },
  { name: "LEAGUE OF LEGENDS",tag: "MOBA",         color: "rgba(200,155,0,0.12)",   border: "rgba(200,155,0,0.3)" },
  { name: "APEX LEGENDS",     tag: "BATTLE ROYALE",color: "rgba(255,100,0,0.12)",   border: "rgba(255,100,0,0.3)" },
  { name: "FORTNITE",         tag: "BATTLE ROYALE",color: "rgba(100,200,255,0.12)", border: "rgba(100,200,255,0.3)" },
  { name: "ROCKET LEAGUE",    tag: "SPORTS",       color: "rgba(0,150,255,0.12)",   border: "rgba(0,150,255,0.3)" },
  { name: "STREET FIGHTER 6", tag: "FIGHTING",     color: "rgba(255,50,50,0.12)",   border: "rgba(255,50,50,0.3)" },
];

/* ── LiveCard component ───────────────────────────────────── */
function LiveCard({
  avatar, user, game, result, amount, resultColor, delay, posClass,
}: {
  avatar: string; user: string; game: string; result: string;
  amount: string; resultColor: string; delay: number; posClass: string;
}) {
  return (
    <motion.div
      className={`glass-panel ${styles.liveCard} ${posClass}`}
      initial={{ opacity: 0, scale: 0.88, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: EASE_OUT }}
    >
      <div className={styles.lcAvatar}>{avatar}</div>
      <div className={styles.lcBody}>
        <span className={styles.lcUser}>{user}</span>
        <span className={styles.lcGame}>{game}</span>
      </div>
      <div className={styles.lcRight}>
        <span className={styles.lcResult} style={{ color: resultColor }}>{result}</span>
        <span className={styles.lcAmount}>{amount}</span>
      </div>
      <span className={styles.lcPulse} style={{ background: resultColor }} />
    </motion.div>
  );
}

/* ── LiveTicker component ─────────────────────────────────── */
function LiveTicker() {
  const items = [...TICKER, ...TICKER]; // duplicate for seamless loop
  return (
    <div className={styles.tickerWrap} aria-hidden>
      <div className={styles.tickerLabel}>
        <TrendingUp size={11} />
        LIVE
      </div>
      <div className={styles.tickerTrack}>
        <div className={styles.tickerInner}>
          {items.map((t, i) => (
            <span key={i} className={styles.tickerItem}>
              <span className={styles.tickerIcon}>{t.icon}</span>
              {t.text}
              <span className={styles.tickerSep}>·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function Home() {
  const reduced = useReducedMotion();

  const fadeUp = (delay = 0) =>
    reduced ? {} : {
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-60px" },
      transition: { duration: 0.6, delay, ease: EASE_OUT },
    };

  return (
    <div className={styles.page}>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className={styles.hero}>

        {/* layered backgrounds */}
        <div className={styles.heroBg}         aria-hidden />
        <div className={styles.heroBgOverlay}  aria-hidden />

        {/* perspective cyber grid floor */}
        <div className={styles.cyberGrid}      aria-hidden />

        {/* diagonal scan beam */}
        <div className={styles.scanBeam}       aria-hidden />

        {/* ambient orbs */}
        <div className={styles.orb1}           aria-hidden />
        <div className={styles.orb2}           aria-hidden />
        <div className={styles.orb3}           aria-hidden />

        {/* floating live activity cards */}
        {!reduced && (
          <>
            <LiveCard {...LIVE_CARDS[0]}
              posClass={styles.lcTopRight} />
            <LiveCard {...LIVE_CARDS[1]}
              posClass={styles.lcMidLeft} />
            <LiveCard {...LIVE_CARDS[2]}
              posClass={styles.lcBotRight} />
          </>
        )}

        {/* main hero content */}
        <div className={styles.heroInner}>
          <motion.div
            className={styles.heroBadge}
            initial={reduced ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          >
            <Zap size={12} />
            POLYGON NETWORK · LIVE
          </motion.div>

          <motion.h1
            className={`font-orbitron ${styles.heroTitle}`}
            initial={reduced ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
          >
            COMPITE.<br />
            <span className={styles.titleAccent}>APUESTA.</span><br />
            COBRA.
          </motion.h1>

          <motion.p
            className={styles.heroSub}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.25, ease: EASE_OUT }}
          >
            La arena de apuestas P2P más segura para gamers de élite.
            <br />Cualquier juego · Cripto nativo · IA árbitro sin sesgos.
          </motion.p>

          <motion.div
            className={styles.heroActions}
            initial={reduced ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.38, ease: EASE_OUT }}
          >
            <Link href="/login" className={`btn-primary ${styles.ctaPrimary}`}>
              ENTRAR A LA ARENA <ChevronRight size={16} />
            </Link>
            <Link href="/como-funciona" className={`btn-secondary ${styles.ctaSecondary}`}>
              CÓMO FUNCIONA
            </Link>
          </motion.div>

          <motion.div
            className={`glass-panel ${styles.statsBar}`}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease: EASE_OUT }}
          >
            {[
              { val: "1.2K+", label: "Partidas Hoy" },
              { val: "$45K+", label: "En Premios"   },
              { val: "35+",   label: "Juegos"        },
              { val: "0.5%",  label: "Comisión"      },
            ].map((s, i) => (
              <div key={i} className={styles.statItem}>
                <span className={`font-orbitron ${styles.statVal}`}>{s.val}</span>
                <span className={styles.statLbl}>{s.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── LIVE TICKER ───────────────────────────────────────── */}
      <LiveTicker />

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section className={styles.section}>
        <motion.div {...fadeUp()} className={styles.sectionLabel}>POR QUÉ ARENACRYPTO</motion.div>
        <motion.h2 {...fadeUp(0.05)} className={`font-orbitron ${styles.sectionTitle}`}>
          DISEÑADO PARA <span className="neon-text-cyan">GANAR</span>
        </motion.h2>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp(i * 0.08)}
              className={`glass-panel ${styles.featureCard}`}
              style={{ "--card-accent": f.color } as React.CSSProperties}
            >
              <div className={styles.featureIconWrap}>
                <f.icon size={24} color={f.color} />
              </div>
              <h3 className={`font-orbitron ${styles.featureTitle}`}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.sectionDark}`}>
        <motion.div {...fadeUp()} className={styles.sectionLabel}>EL PROCESO</motion.div>
        <motion.h2 {...fadeUp(0.05)} className={`font-orbitron ${styles.sectionTitle}`}>
          EN <span style={{ color: "#8B5CF6", textShadow: "0 0 20px rgba(139,92,246,0.5)" }}>4 PASOS</span>
        </motion.h2>
        <div className={styles.stepsRow}>
          {STEPS.map((s, i) => (
            <motion.div key={s.n} {...fadeUp(i * 0.09)} className={styles.stepCard}>
              <span className={`font-orbitron ${styles.stepNumber}`}>{s.n}</span>
              <h4 className={`font-orbitron ${styles.stepTitle}`}>{s.title}</h4>
              <p className={styles.stepDesc}>{s.desc}</p>
              {i < STEPS.length - 1 && <div className={styles.stepArrow} aria-hidden />}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── GAMES ────────────────────────────────────────────── */}
      <section className={styles.section}>
        <motion.div {...fadeUp()} className={styles.sectionLabel}>CATÁLOGO</motion.div>
        <motion.h2 {...fadeUp(0.05)} className={`font-orbitron ${styles.sectionTitle}`}>
          TU JUEGO ESTÁ <span className="neon-text-cyan">AQUÍ</span>
        </motion.h2>
        <div className={styles.gamesGrid}>
          {GAMES.map((g, i) => (
            <motion.div
              key={g.name}
              {...fadeUp(i * 0.05)}
              className={styles.gameChip}
              style={{ background: g.color, borderColor: g.border }}
            >
              <Trophy size={13} color={g.border.replace("0.3", "0.9")} />
              <span className={`font-orbitron ${styles.gameName}`}>{g.name}</span>
              <span className={styles.gameTag}>{g.tag}</span>
            </motion.div>
          ))}
          <motion.div {...fadeUp(GAMES.length * 0.05)} className={styles.gameChipMore}>
            <span className={`font-orbitron ${styles.gameName}`}>+27 JUEGOS MÁS</span>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className={`${styles.section} ${styles.ctaSection}`}>
        <div className={styles.ctaBg} aria-hidden />
        <motion.div {...fadeUp()} className={styles.ctaInner}>
          <h2 className={`font-orbitron ${styles.ctaTitle}`}>
            EL RING TE <span className="neon-text-cyan">ESPERA</span>
          </h2>
          <p className={styles.ctaSub}>
            Únete a miles de jugadores que ya compiten por cripto real. Registro en 30 segundos.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/login" className={`btn-primary ${styles.ctaPrimary}`}>
              CREAR CUENTA GRATIS <ChevronRight size={16} />
            </Link>
            <Link href="/login" className="btn-secondary">
              YA TENGO CUENTA
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
