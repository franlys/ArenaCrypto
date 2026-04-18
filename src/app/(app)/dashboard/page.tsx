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

const FALLBACK_GAMES = [
  { slug: "valorant",          name: "Valorant",          category: "FPS",           icon: "⚡" },
  { slug: "cs2",               name: "Counter-Strike 2",  category: "FPS",           icon: "💣" },
  { slug: "league-of-legends", name: "League of Legends", category: "MOBA",          icon: "⚔️" },
  { slug: "ea-sports-fc-25",   name: "EA Sports FC 25",   category: "Sports",        icon: "⚽" },
  { slug: "fortnite",          name: "Fortnite",          category: "Battle Royale", icon: "🏗️" },
];

const FALLBACK_MODES: Record<string, GameMode[]> = {
  valorant:          [{ mode: "1v1_ranked", label: "Clasificatoria 1v1", icon: "⚡", team_size: 1, min_stake: 5,  max_stake: 500  },
                     { mode: "1v1_cash",   label: "Cash Game 1v1",      icon: "💰", team_size: 1, min_stake: 10, max_stake: 1000 },
                     { mode: "2v2",        label: "2v2 Equipos",        icon: "👥", team_size: 2, min_stake: 5,  max_stake: 300  }],
  cs2:               [{ mode: "1v1_ranked", label: "Clasificatoria 1v1", icon: "💣", team_size: 1, min_stake: 5,  max_stake: 500  },
                     { mode: "1v1_cash",   label: "Cash Game 1v1",      icon: "💰", team_size: 1, min_stake: 10, max_stake: 1000 }],
  "league-of-legends":[{ mode: "1v1_ranked", label: "Mid Lane 1v1",     icon: "⚔️", team_size: 1, min_stake: 5,  max_stake: 300  }],
  "ea-sports-fc-25": [{ mode: "1v1_ranked", label: "Clasificatoria 1v1", icon: "⚽", team_size: 1, min_stake: 5,  max_stake: 500  },
                     { mode: "1v1_cash",   label: "Cash Game 1v1",      icon: "💰", team_size: 1, min_stake: 10, max_stake: 1000 }],
  fortnite:          [{ mode: "1v1_ranked", label: "Clasificatoria 1v1", icon: "🏗️", team_size: 1, min_stake: 5,  max_stake: 300  }],
};

const CATEGORIES = ["Todos", "FPS", "MOBA", "Sports", "Battle Royale", "Fighting", "RTS", "Other"];

interface Game     { slug: string; name: string; category: string; icon: string }
interface GameMode { mode: string; label: string; icon: string; team_size: number; min_stake: number; max_stake: number }

const MODE_STAKE_PRESETS: Record<string, number[]> = {
  "1v1_ranked": [5, 10, 25, 50, 100],
  "1v1_cash":   [10, 25, 50, 100, 250],
  "2v2":        [5, 10, 20, 50],
  "battle_royale": [5, 10, 25],
};

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { isTestUser } = useUser();

  const [games, setGames]           = useState<Game[]>(FALLBACK_GAMES);
  const [activeCategory, setCategory] = useState("Todos");
  const [selectedGame, setGame]     = useState(FALLBACK_GAMES[0].slug);
  const [modes, setModes]           = useState<GameMode[]>(FALLBACK_MODES["valorant"]);
  const [selectedMode, setMode]     = useState<GameMode>(FALLBACK_MODES["valorant"][0]);
  const [stake, setStake]           = useState(10);
  const [isSearching, setSearching] = useState(false);
  const [liveTournaments, setLiveT] = useState<any[]>([]);

  // Cargar juegos al montar
  useEffect(() => {
    supabase
      .from("games")
      .select("slug, name, category, icon")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setGames(data);
          loadModes(data[0].slug);
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

  const loadModes = async (gameSlug: string) => {
    const { data } = await supabase
      .from("game_modes")
      .select("mode, label, icon, team_size, min_stake, max_stake")
      .eq("game_slug", gameSlug)
      .eq("is_active", true)
      .order("sort_order");

    const list: GameMode[] = (data && data.length > 0)
      ? data
      : (FALLBACK_MODES[gameSlug] ?? FALLBACK_MODES["valorant"]);

    setModes(list);
    setMode(list[0]);
    setStake(list[0].min_stake);
  };

  const handleGameChange = (slug: string) => {
    setGame(slug);
    loadModes(slug);
  };

  const handleModeChange = (m: GameMode) => {
    setMode(m);
    // Clamp stake to new mode's limits
    setStake(s => Math.min(Math.max(s, m.min_stake), m.max_stake));
  };

  const visibleGames = activeCategory === "Todos"
    ? games
    : games.filter((g) => g.category === activeCategory);

  const selectedGameObj = games.find((g) => g.slug === selectedGame) ?? games[0];
  const stakePresets    = MODE_STAKE_PRESETS[selectedMode?.mode] ?? [5, 10, 25, 50, 100];

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <h1 className={`font-orbitron ${styles.title}`}>
          Tu <span className="neon-text-cyan">Dashboard</span>
        </h1>
        <p className={styles.subtitle}>Bienvenido de nuevo, soldado. Gestiona tus fondos y busca tu próximo match.</p>
        {isConnected && address && (
          <div className={styles.walletChip}>
            <span className={styles.walletDot} />
            {address.slice(0, 6)}…{address.slice(-4)} · Polygon
          </div>
        )}
      </motion.header>

      {/* ── Torneos en vivo ── */}
      {liveTournaments.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
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
                <div className="glass-panel" style={{ padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
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
        {/* ── Izquierda: Arena ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: EASE_OUT }}
        >
          {!isSearching ? (
            <div className={`glass-panel ${styles.arenaCard}`} style={{ padding: "1.75rem" }}>
              <h2 className={`font-orbitron ${styles.cardTitle}`}>
                Entrar a la <span className="neon-text-cyan">Arena</span>
              </h2>

              {/* Filtro de categoría */}
              <div>
                <p className={styles.fieldLabel} style={{ marginBottom: "0.5rem" }}>CATEGORÍA</p>
                <div className={styles.categoryRow}>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      className={`${styles.categoryTag} ${activeCategory === cat ? styles.categoryTagActive : ""}`}
                      onClick={() => {
                        setCategory(cat);
                        const first = cat === "Todos" ? games[0] : games.find((g) => g.category === cat);
                        if (first) handleGameChange(first.slug);
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de juego */}
              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>VIDEOJUEGO</label>
                  <select
                    className={styles.select}
                    value={selectedGame}
                    onChange={(e) => handleGameChange(e.target.value)}
                  >
                    {visibleGames.map((g) => (
                      <option key={g.slug} value={g.slug}>{g.icon} {g.name}</option>
                    ))}
                  </select>
                </div>

                {/* Selector de modo — dinámico por juego */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>MODO DE JUEGO</label>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                    {modes.map((m) => (
                      <button
                        key={m.mode}
                        onClick={() => handleModeChange(m)}
                        style={{
                          fontFamily: "Orbitron, sans-serif",
                          fontSize: "0.55rem",
                          letterSpacing: "0.1em",
                          padding: "0.4rem 0.85rem",
                          borderRadius: "6px",
                          cursor: "pointer",
                          border: "1px solid",
                          borderColor: selectedMode?.mode === m.mode ? "#00F5FF" : "rgba(255,255,255,0.15)",
                          background: selectedMode?.mode === m.mode ? "rgba(0,245,255,0.1)" : "rgba(255,255,255,0.04)",
                          color: selectedMode?.mode === m.mode ? "#00F5FF" : "hsl(var(--text-muted))",
                          transition: "all 150ms",
                        }}
                      >
                        {m.icon} {m.label}
                        {m.team_size > 1 && (
                          <span style={{ marginLeft: "0.3rem", opacity: 0.6 }}>·{m.team_size}v{m.team_size}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedMode && (
                    <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.7rem", color: "hsl(var(--text-muted))", marginTop: "0.4rem", letterSpacing: "0.03em" }}>
                      Apuesta: ${selectedMode.min_stake} – ${selectedMode.max_stake} USDC
                    </p>
                  )}
                </div>
              </div>

              {/* Apuesta */}
              <div className={styles.fieldGroup} style={{ marginTop: "0.5rem" }}>
                <label className={styles.fieldLabel}>
                  APUESTA {isTestUser ? "🧪 (SALDO TEST)" : "(USDC)"}
                </label>
                <input
                  type="number"
                  min={selectedMode?.min_stake ?? 1}
                  max={selectedMode?.max_stake ?? 1000}
                  className={styles.input}
                  value={stake}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setStake(Math.min(Math.max(v, selectedMode?.min_stake ?? 1), selectedMode?.max_stake ?? 1000));
                  }}
                />
                <div className={styles.stakePills}>
                  {stakePresets
                    .filter(p => p >= (selectedMode?.min_stake ?? 0) && p <= (selectedMode?.max_stake ?? 9999))
                    .map((p) => (
                      <button key={p} className={`${styles.stakePill} ${stake === p ? styles.stakePillActive : ""}`} onClick={() => setStake(p)}>
                        ${p}
                      </button>
                    ))}
                </div>
              </div>

              {/* CTA */}
              <div className={styles.ctaRow} style={{ marginTop: "1.25rem" }}>
                <button
                  className="btn-primary"
                  style={{ width: "100%", padding: "0.85rem", fontSize: "0.78rem", letterSpacing: "0.15em" }}
                  onClick={() => setSearching(true)}
                  disabled={!isConnected && !isTestUser}
                >
                  {selectedGameObj?.icon} BUSCAR RIVAL · {selectedMode?.label ?? "1v1"}
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
                mode={selectedMode?.mode ?? "1v1_ranked"}
                modeLabel={selectedMode?.label ?? "1v1 Ranked"}
                stake={stake}
                isTest={isTestUser}
                onCancel={() => setSearching(false)}
              />
            </div>
          )}
        </motion.section>

        {/* ── Derecha: Stats ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16, ease: EASE_OUT }}
          className={styles.statsCard}
        >
          <div className="glass-panel" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 className={`font-orbitron ${styles.statsTitle}`}>Resumen Global</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={`font-orbitron ${styles.statValue}`}>0</span>
                <span className={styles.statLabel}>Matches</span>
              </div>
              <div className={styles.statBox}>
                <span className={`font-orbitron ${styles.statValue}`} style={{ color: "hsl(var(--neon-purple))" }}>0%</span>
                <span className={styles.statLabel}>W/L Ratio</span>
              </div>
              <div className={styles.statBox}>
                <span className={`font-orbitron ${styles.statValue}`} style={{ color: "#00F5FF" }}>$0</span>
                <span className={styles.statLabel}>Ganado</span>
              </div>
              <div className={styles.statBox}>
                <span className={`font-orbitron ${styles.statValue}`}>0</span>
                <span className={styles.statLabel}>Racha</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 className={`font-orbitron ${styles.statsTitle}`}>Partidas Recientes</h3>
            <div className={styles.emptyState}>Sin partidas aún. ¡Entra a la Arena!</div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
