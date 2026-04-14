"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";
import MatchmakingQueue from "@/components/Arena/MatchmakingQueue";
import styles from "./dashboard.module.css";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

// Fallback games if DB is unavailable
const FALLBACK_GAMES = [
  { slug: "valorant",          name: "Valorant",              category: "FPS",           icon: "⚡" },
  { slug: "cs2",               name: "Counter-Strike 2",      category: "FPS",           icon: "💣" },
  { slug: "league-of-legends", name: "League of Legends",     category: "MOBA",          icon: "⚔️" },
  { slug: "ea-sports-fc-25",   name: "EA Sports FC 25",       category: "Sports",        icon: "⚽" },
  { slug: "fortnite",          name: "Fortnite",              category: "Battle Royale", icon: "🏗️" },
];

const CATEGORIES = ["Todos", "FPS", "MOBA", "Sports", "Battle Royale", "Fighting", "RTS", "Other"];
const STAKE_PRESETS = [5, 10, 25, 50, 100];

interface Game {
  slug: string;
  name: string;
  category: string;
  icon: string;
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const [games, setGames]               = useState<Game[]>(FALLBACK_GAMES);
  const [activeCategory, setCategory]   = useState("Todos");
  const [selectedGame, setGame]         = useState(FALLBACK_GAMES[0].slug);
  const [stake, setStake]               = useState(10);
  const [isSearching, setSearching]     = useState(false);

  // Load games from DB
  useEffect(() => {
    supabase
      .from("games")
      .select("slug, name, category, icon")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setGames(data);
          setGame(data[0].slug);
        }
      });
  }, []);

  const visibleGames =
    activeCategory === "Todos"
      ? games
      : games.filter((g) => g.category === activeCategory);

  const selectedGameObj = games.find((g) => g.slug === selectedGame) ?? games[0];

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <h1 className={`font-orbitron ${styles.title}`}>
          Tu <span className="neon-text-cyan">Dashboard</span>
        </h1>
        <p className={styles.subtitle}>
          Bienvenido de nuevo, soldado. Gestiona tus fondos y busca tu próximo match.
        </p>

        {/* Wallet status chip */}
        {isConnected && address && (
          <div className={styles.walletChip}>
            <span className={styles.walletDot} />
            {address.slice(0, 6)}…{address.slice(-4)} · Polygon
          </div>
        )}
      </motion.header>

      <div className={styles.grid}>
        {/* ── Left: Arena matchmaking ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: EASE_OUT }}
        >
          {!isSearching ? (
            <div className={`glass-panel ${styles.arenaCard}`} style={{ padding: "1.75rem" }}>
              <h2 className={`font-orbitron ${styles.cardTitle}`}>
                Entrar a la <span className="neon-text-cyan">Arena</span>
              </h2>

              {/* Category filter */}
              <div>
                <p className={styles.fieldLabel} style={{ marginBottom: "0.5rem" }}>CATEGORÍA</p>
                <div className={styles.categoryRow}>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      className={`${styles.categoryTag} ${activeCategory === cat ? styles.categoryTagActive : ""}`}
                      onClick={() => {
                        setCategory(cat);
                        // Auto-select first game of new category
                        const first =
                          cat === "Todos"
                            ? games[0]
                            : games.find((g) => g.category === cat);
                        if (first) setGame(first.slug);
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game + stake form */}
              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>VIDEOJUEGO</label>
                  <select
                    className={styles.select}
                    value={selectedGame}
                    onChange={(e) => setGame(e.target.value)}
                  >
                    {visibleGames.map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.icon} {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>APUESTA (USDC)</label>
                  <input
                    type="number"
                    min={1}
                    className={styles.input}
                    value={stake}
                    onChange={(e) => setStake(Math.max(1, Number(e.target.value)))}
                  />
                  <div className={styles.stakePills}>
                    {STAKE_PRESETS.map((p) => (
                      <button
                        key={p}
                        className={styles.stakePill}
                        onClick={() => setStake(p)}
                      >
                        ${p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className={styles.ctaRow}>
                <button
                  className="btn-primary"
                  style={{ width: "100%", padding: "0.85rem", fontSize: "0.78rem", letterSpacing: "0.15em" }}
                  onClick={() => setSearching(true)}
                  disabled={!isConnected}
                >
                  {selectedGameObj?.icon} BUSCAR RIVAL · {selectedGameObj?.name}
                </button>
                {!isConnected && (
                  <p className={styles.ctaHint}>Conecta tu wallet para apostar.</p>
                )}
              </div>
            </div>
          ) : (
            <div className={`glass-panel ${styles.searchingCard}`} style={{ padding: "1.75rem" }}>
              <MatchmakingQueue
                gameId={selectedGame}
                mode="1v1 Ranked"
                stake={stake}
              />
              <div style={{ marginTop: "1rem", textAlign: "center" }}>
                <button className={styles.btnBack} onClick={() => setSearching(false)}>
                  ← Volver a configuración
                </button>
              </div>
            </div>
          )}
        </motion.section>

        {/* ── Right: Stats ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16, ease: EASE_OUT }}
          className={styles.statsCard}
        >
          <div className={`glass-panel`} style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 className={`font-orbitron ${styles.statsTitle}`}>Resumen Global</h3>

            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={`font-orbitron ${styles.statValue}`}>0</span>
                <span className={styles.statLabel}>Matches</span>
              </div>
              <div className={styles.statBox}>
                <span className={`font-orbitron ${styles.statValue}`} style={{ color: "hsl(var(--neon-purple))" }}>
                  0%
                </span>
                <span className={styles.statLabel}>W/L Ratio</span>
              </div>
              <div className={styles.statBox}>
                <span className={`font-orbitron ${styles.statValue}`} style={{ color: "#00F5FF" }}>
                  $0
                </span>
                <span className={styles.statLabel}>Ganado</span>
              </div>
              <div className={styles.statBox}>
                <span className={`font-orbitron ${styles.statValue}`}>0</span>
                <span className={styles.statLabel}>Racha</span>
              </div>
            </div>
          </div>

          {/* Recent matches */}
          <div className={`glass-panel`} style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 className={`font-orbitron ${styles.statsTitle}`}>Partidas Recientes</h3>
            <div className={styles.emptyState}>
              Sin partidas aún. ¡Entra a la Arena!
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
