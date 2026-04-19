"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { tournamentDb as ptClient } from "@/lib/supabase/tournament-db";
import { supabase } from "@/lib/supabase";
import styles from "../../admin.module.css";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

// ptClient instantiated via singleton

const MARKET_LABELS: Record<string, string> = {
  tournament_winner:    "Ganador Torneo",
  tournament_mvp:       "MVP / Top Fragger",
  round_winner:         "Ganador Ronda",
  round_top_fragger:    "Top Kills Ronda",
  round_top_placement:  "Top Placement",
  round_player_fragger: "Top Fragger Individual",
};

const STATUS_COLOR: Record<string, string> = {
  open:     "#10b981",
  closed:   "#f59e0b",
  resolved: "#00F5FF",
  canceled: "#f87171",
  active:   "#10b981",
  finished: "#00F5FF",
  draft:    "#6b7280",
};

type Tournament = {
  id: string; name: string; status: string; slug: string;
  arena_betting_enabled: boolean; arena_betting_status: string;
  total_live_viewers: number; start_date: string | null; end_date: string | null;
  total_matches: number; matches_completed: number;
};
type Match = {
  id: string; match_number: number; name: string; round_number: number;
  is_completed: boolean; completed_at: string | null; map_name: string | null;
};
type Team = { id: string; name: string; avatar_url: string | null };
type Standing = {
  team_id: string; rank: number; total_kills: number;
  total_points: number; kill_rate: number; pot_top_count: number;
};
type Market = {
  id: string; market_type: string; round_number: number | null;
  status: string; total_volume: number; kronix_volume: number;
  pt_match_id: string | null; resolved_at: string | null;
};

export default function TournamentSupervisionPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament]   = useState<Tournament | null>(null);
  const [matches, setMatches]         = useState<Match[]>([]);
  const [teams, setTeams]             = useState<Team[]>([]);
  const [standings, setStandings]     = useState<Standing[]>([]);
  const [markets, setMarkets]         = useState<Market[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [tab, setTab]                 = useState<"partidas" | "standings" | "mercados">("partidas");

  useEffect(() => {
    if (!tournamentId) return;
    async function load() {
      const [
        { data: t, error: tErr },
        { data: m },
        { data: tm },
        { data: st },
        { data: mk },
      ] = await Promise.all([
        ptClient.from("tournaments").select("*").eq("id", tournamentId).limit(1).then(r => ({ data: r.data?.[0] ?? null, error: r.error })),
        ptClient.from("matches").select("id,match_number,name,round_number,is_completed,completed_at,map_name").eq("tournament_id", tournamentId).order("match_number"),
        ptClient.from("teams").select("id,name,avatar_url").eq("tournament_id", tournamentId),
        ptClient.from("team_standings").select("team_id,rank,total_kills,total_points,kill_rate,pot_top_count").eq("tournament_id", tournamentId).order("rank"),
        supabase.from("bet_markets").select("id,market_type,round_number,status,total_volume,kronix_volume,pt_match_id,resolved_at").eq("pt_tournament_id", tournamentId).order("opened_at"),
      ]);
      if (tErr) setLoadError(`${tErr.code}: ${tErr.message}`);
      setTournament(t ?? null);
      setMatches(m ?? []);
      setTeams(tm ?? []);
      setStandings(st ?? []);
      setMarkets(mk ?? []);
      setLoading(false);
    }
    load();
  }, [tournamentId]);

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
  const completedMatches = matches.filter(m => m.is_completed).length;
  const totalVolume = markets.reduce((s, m) => s + Number(m.total_volume), 0);
  const openMarkets = markets.filter(m => m.status === "open").length;

  if (loading) return <p className={styles.loadingText}>CARGANDO TORNEO...</p>;
  if (!tournament) return (
    <div style={{ padding: "2rem" }}>
      <p className={styles.loadingText}>Torneo no encontrado.</p>
      {loadError && <p style={{ color: "#f87171", fontFamily: "monospace", fontSize: "0.75rem", marginTop: "0.5rem" }}>{loadError}</p>}
      <p style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.7rem", marginTop: "0.25rem" }}>ID: {tournamentId}</p>
    </div>
  );

  return (
    <div className={styles.dashboard}>
      {/* Back + header */}
      <div style={{ marginBottom: "0.5rem" }}>
        <Link
          href="/admin/events"
          className="font-orbitron"
          style={{ fontSize: "0.65rem", letterSpacing: "0.12em", color: "var(--text-muted)", textDecoration: "none" }}
        >
          ← EVENTOS
        </Link>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <h1 className="font-orbitron" style={{ fontSize: "1.8rem" }}>
            {tournament.name.toUpperCase().split(" ").map((w, i) =>
              i === 0
                ? <span key={i}>{w} </span>
                : <span key={i} className="neon-text-cyan">{w} </span>
            )}
          </h1>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.4rem" }}>
            <span className={styles.statusBadge} style={{
              background: `${STATUS_COLOR[tournament.status] ?? "#888"}18`,
              border: `1px solid ${STATUS_COLOR[tournament.status] ?? "#888"}44`,
              color: STATUS_COLOR[tournament.status] ?? "#888",
            }}>
              {tournament.status.toUpperCase()}
            </span>
            <span className={styles.statusBadge} style={{
              background: tournament.arena_betting_status === "open" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
              border: `1px solid ${tournament.arena_betting_status === "open" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
              color: tournament.arena_betting_status === "open" ? "#10b981" : "#f59e0b",
            }}>
              APUESTAS {tournament.arena_betting_status.toUpperCase()}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontFamily: "Rajdhani, sans-serif" }}>
              {tournament.total_live_viewers ?? 0} viewers en vivo
            </span>
          </div>
        </div>
        <a
          href={`https://proyecto-torneo-flcf.vercel.app/t/${tournament?.slug ?? tournamentId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.btnResolve}
          style={{ padding: "0.5rem 1.25rem", textDecoration: "none", fontSize: "0.65rem" }}
        >
          VER EN KRONIX ↗
        </a>
      </div>

      {/* KPI strip */}
      <div className={styles.statsGrid}>
        {[
          { label: "Equipos",        value: teams.length,                           color: "#8b5cf6" },
          { label: "Partidas",       value: `${completedMatches} / ${matches.length}`, color: "#00F5FF" },
          { label: "Mercados",       value: `${openMarkets} abiertos`,              color: "#10b981" },
          { label: "Vol. Apuestas",  value: `$${totalVolume.toFixed(2)}`,           color: "#f59e0b" },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            className={styles.statCard}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, ease: EASE_OUT }}
            style={{ "--glow-color": `${k.color}33` } as any}
          >
            <div className={styles.glowBg} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <span className={styles.statLabel}>{k.label}</span>
              <div className={styles.statValue} style={{ color: k.color, fontSize: "1.5rem" }}>
                {k.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0.5rem" }}>
        {(["partidas", "standings", "mercados"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="font-orbitron"
            style={{
              background: tab === t ? "rgba(0,245,255,0.07)" : "transparent",
              border: "none", cursor: "pointer",
              fontSize: "0.65rem", letterSpacing: "0.12em", padding: "0.4rem 1rem",
              borderRadius: "6px",
              color: tab === t ? "#00F5FF" : "var(--text-muted)",
              transition: "all 150ms ease-out",
            }}
          >
            {t === "partidas" ? "PARTIDAS" : t === "standings" ? "STANDINGS" : "MERCADOS"}
          </button>
        ))}
      </div>

      {/* Partidas */}
      {tab === "partidas" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ease: EASE_OUT }}>
          {matches.length === 0 ? (
            <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif" }}>
              No hay partidas registradas para este torneo.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
              {matches.map((m, i) => (
                <motion.div
                  key={m.id}
                  className="glass-panel"
                  style={{ padding: "1.2rem", position: "relative", overflow: "hidden" }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, ease: EASE_OUT }}
                >
                  {/* Status strip */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "3px",
                    background: m.is_completed ? "#10b981" : "rgba(0,245,255,0.3)",
                  }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="font-orbitron" style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                        RONDA {m.round_number} · #{m.match_number}
                      </div>
                      <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "1rem", fontWeight: 700, color: "white" }}>
                        {m.name}
                      </div>
                      {m.map_name && (
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          {m.map_name}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: "0.6rem", fontFamily: "Orbitron, sans-serif",
                      padding: "3px 8px", borderRadius: "4px",
                      background: m.is_completed ? "rgba(16,185,129,0.15)" : "rgba(0,245,255,0.08)",
                      border: `1px solid ${m.is_completed ? "rgba(16,185,129,0.4)" : "rgba(0,245,255,0.2)"}`,
                      color: m.is_completed ? "#10b981" : "#00F5FF",
                    }}>
                      {m.is_completed ? "FIN" : "PEND"}
                    </span>
                  </div>
                  {m.completed_at && (
                    <div style={{ marginTop: "0.75rem", fontSize: "0.65rem", color: "var(--text-muted)" }}>
                      ✓ {new Date(m.completed_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Standings */}
      {tab === "standings" && (
        <motion.div
          className="glass-panel"
          style={{ overflow: "hidden" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ease: EASE_OUT }}
        >
          {standings.length === 0 ? (
            <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif" }}>
              Sin standings aún. Se actualizan al completar partidas en Kronix.
            </p>
          ) : (
            <table className={styles.withdrawalTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>EQUIPO</th>
                  <th>PUNTOS</th>
                  <th>KILLS</th>
                  <th>KILL RATE</th>
                  <th>TOP POTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => {
                  const team = teamMap[s.team_id];
                  return (
                    <tr key={s.team_id}>
                      <td>
                        <span style={{
                          fontFamily: "Orbitron, sans-serif",
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: s.rank === 1 ? "#f59e0b" : s.rank === 2 ? "#9ca3af" : s.rank === 3 ? "#b45309" : "var(--text-muted)",
                        }}>
                          {s.rank === 1 ? "🥇" : s.rank === 2 ? "🥈" : s.rank === 3 ? "🥉" : `#${s.rank}`}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          {team?.avatar_url && (
                            <img src={team.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: "4px", objectFit: "cover" }} />
                          )}
                          <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem", color: "white" }}>
                            {team?.name ?? s.team_id.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: "#00F5FF", fontWeight: 700 }}>{Number(s.total_points).toFixed(1)}</td>
                      <td style={{ color: "white", fontWeight: 700 }}>{s.total_kills}</td>
                      <td style={{ color: "var(--text-muted)" }}>{Number(s.kill_rate).toFixed(2)}</td>
                      <td style={{ color: "var(--text-muted)" }}>{s.pot_top_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </motion.div>
      )}

      {/* Mercados */}
      {tab === "mercados" && (
        <motion.div
          className="glass-panel"
          style={{ overflow: "hidden" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ease: EASE_OUT }}
        >
          {markets.length === 0 ? (
            <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif" }}>
              Sin mercados. Presiona SYNC KRONIX en la página de Markets.
            </p>
          ) : (
            <table className={styles.withdrawalTable}>
              <thead>
                <tr>
                  <th>MERCADO</th>
                  <th>RONDA</th>
                  <th>ESTADO</th>
                  <th>VOL. TOTAL</th>
                  <th>VOL. KRONIX</th>
                  <th>RESOLUCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {markets.map(m => (
                  <tr key={m.id}>
                    <td style={{ color: "white", fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
                      {MARKET_LABELS[m.market_type] ?? m.market_type}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {m.round_number ? `R${m.round_number}` : "—"}
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={{
                        background: `${STATUS_COLOR[m.status] ?? "#888"}18`,
                        border: `1px solid ${STATUS_COLOR[m.status] ?? "#888"}44`,
                        color: STATUS_COLOR[m.status] ?? "#888",
                      }}>
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: "white", fontWeight: 700 }}>${Number(m.total_volume).toFixed(2)}</td>
                    <td style={{ color: "#8b5cf6", fontWeight: 700 }}>${Number(m.kronix_volume).toFixed(2)}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                      {m.resolved_at
                        ? new Date(m.resolved_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      )}
    </div>
  );
}
