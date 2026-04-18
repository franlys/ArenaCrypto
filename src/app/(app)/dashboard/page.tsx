"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAccount } from "wagmi";
import { supabase } from "@/lib/supabase";
import { tournamentDb as ptClient } from "@/lib/supabase/tournament-db";
import { useUser } from "@/contexts/UserContext";
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
  const { isTestUser } = useUser();

  const [games, setGames]               = useState<Game[]>(FALLBACK_GAMES);
  const [activeCategory, setCategory]   = useState("Todos");
  const [selectedGame, setGame]         = useState(FALLBACK_GAMES[0].slug);
  const [stake, setStake]               = useState(10);
  const [isSearching, setSearching]     = useState(false);
  const [liveTournaments, setLiveT]     = useState<any[]>([]);

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

    ptClient
      .from("tournaments")
      .select("id, name, slug, status, arena_betting_status, arena_betting_enabled, total_live_viewers")
      .eq("arena_betting_enabled", true)
      .eq("arena_betting_status", "open")
      .in("status", ["active", "draft"])
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setLiveT(data ?? []));
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

      {/* ── Live tournaments strip ── */}
      {liveTournaments.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: EASE_OUT }}
          style={{ marginBottom: "1.5rem" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981", display: "inline-block" }} />
              <span className="font-orbitron" style={{ fontSize: "0.65rem", letterSpacing: "0.15em", color: "#10b981" }}>TORNEOS EN VIVO</span>
            </div>
            <Link href="/tournaments" className="font-orbitron" style={{ fontSize: "0.6rem", letterSpacing: "0.12em", color: "#00F5FF", textDecoration: "none" }}>
              VER TODOS →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
            {liveTournaments.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.slug}`} style={{ textDecoration: "none" }}>
                <div className="glass-panel" style={{ padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color 150ms ease-out", cursor: "pointer" }}>
                  <div>
                    <div className="font-orbitron" style={{ fontSize: "0.78rem", color: "white", marginBottom: "4px" }}>{t.name}</div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif" }}>
                      {t.total_live_viewers ?? 0} viewers · Apuestas abiertas
                    </div>
                  </div>
                  <span className="font-orbitron" style={{ fontSize: "0.6rem", color: "#00F5FF", letterSpacing: "0.1em" }}>APOSTAR →</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

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
                  disabled={!isConnected && !isTestUser}
                >
                  {selectedGameObj?.icon} BUSCAR RIVAL · {selectedGameObj?.name}
                </button>
                {!isConnected && !isTestUser && (
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
                isTest={isTestUser}
                onCancel={() => setSearching(false)}
              />
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
