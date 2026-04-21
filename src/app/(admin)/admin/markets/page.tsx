"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { tournamentDb as ptClient } from "@/lib/supabase/tournament-db";
import styles from "../admin.module.css";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const MARKET_LABELS: Record<string, string> = {
  tournament_winner:    "Ganador del Torneo",
  tournament_mvp:       "MVP / Top Fragger Torneo",
  round_winner:         "Ganador de Ronda",
  round_top_fragger:    "Top Kills en Ronda (Equipo)",
  round_top_placement:  "Top Placement",
  round_player_fragger: "Top Fragger Individual",
};

const STATUS_COLOR: Record<string, string> = {
  open:     "#10b981",
  closed:   "#f59e0b",
  resolved: "#00F5FF",
  canceled: "#f87171",
};

const BETTING_STATUS_COLOR: Record<string, string> = {
  open:   "#10b981",
  closed: "#f87171",
  paused: "#f59e0b",
};

// Player markets use pt_target_id = player.id; team markets use team.id
const PLAYER_MARKETS = new Set(["tournament_mvp", "round_player_fragger"]);

type Market = {
  id: string;
  pt_tournament_id: string;
  market_type: string;
  round_number: number | null;
  status: string;
  total_volume: number;
  kronix_volume: number;
  opened_at: string;
  resolved_at: string | null;
  result_pt_team_id: string | null;
  result_pt_player_id: string | null;
};

type Revenue = {
  pt_tournament_id: string;
  tournament_name: string | null;
  total_volume: number;
  kronix_volume: number;
  commission_amount: number;
  status: string;
  webhook_sent_at: string | null;
};

type KronixTournament = {
  id: string;
  name: string;
  slug: string;
  status: string;
  arena_betting_enabled: boolean;
  arena_betting_status: string;
  total_live_viewers: number;
};

type PtOption = { id: string; label: string };

type ResolveState = {
  market: Market;
  options: PtOption[];
  selectedId: string;
  loading: boolean;
  result: { won: number; lost: number; pool: string } | null;
  error: string;
};

// Removed ptClient instantiation in favor of singleton

export default function MarketsPage() {
  const [markets, setMarkets]         = useState<Market[]>([]);
  const [revenue, setRevenue]         = useState<Revenue[]>([]);
  const [kronixTournaments, setKronixT] = useState<KronixTournament[]>([]);
  const [syncing, setSyncing]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<"kronix" | "markets" | "revenue">("kronix");
  const [resolveState, setResolve]    = useState<ResolveState | null>(null);

  const fetchData = async () => {
    const [{ data: m }, { data: r }, { data: kt }] = await Promise.all([
      supabase.from("bet_markets").select("*").order("opened_at", { ascending: false }).limit(100),
      supabase.from("kronix_revenue").select("*").order("period_end", { ascending: false }),
      ptClient
        .from("tournaments")
        .select("id, name, slug, status, arena_betting_enabled, arena_betting_status, total_live_viewers")
        .eq("arena_betting_enabled", true)
        .order("created_at", { ascending: false }),
    ]);
    setMarkets(m ?? []);
    setRevenue(r ?? []);
    setKronixT(kt ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/markets/sync", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token ?? ""}` },
      });
      await fetchData();
    } finally {
      setSyncing(false);
    }
  };

  // Open resolve modal: load teams or participants from PT
  const openResolve = async (market: Market) => {
    setResolve({ market, options: [], selectedId: "", loading: true, result: null, error: "" });

    const isPlayer = PLAYER_MARKETS.has(market.market_type);
    let options: PtOption[] = [];

    if (isPlayer) {
      const { data } = await ptClient
        .from("participants")
        .select("id, display_name")
        .eq("tournament_id", market.pt_tournament_id);
      options = (data ?? []).map((p: any) => ({ id: p.id, label: p.display_name ?? p.id }));
    } else {
      const { data } = await ptClient
        .from("teams")
        .select("id, name")
        .eq("tournament_id", market.pt_tournament_id);
      options = (data ?? []).map((t: any) => ({ id: t.id, label: t.name ?? t.id }));
    }

    setResolve(prev => prev ? { ...prev, options, loading: false } : null);
  };

  const handleResolve = async () => {
    if (!resolveState || !resolveState.selectedId) return;
    const { market, selectedId } = resolveState;
    const isPlayer = PLAYER_MARKETS.has(market.market_type);

    setResolve(prev => prev ? { ...prev, loading: true, error: "" } : null);

    const { data, error } = await supabase.rpc("resolve_bet_market", {
      p_market_id:             market.id,
      p_result_pt_team_id:     isPlayer ? null : selectedId,
      p_result_pt_player_id:   isPlayer ? selectedId : null,
    });

    if (error || data?.error) {
      setResolve(prev => prev ? { ...prev, loading: false, error: error?.message ?? data?.error } : null);
      return;
    }

    setResolve(prev => prev ? {
      ...prev,
      loading: false,
      result: {
        won:  data.won_count,
        lost: data.lost_count,
        pool: `$${Number(data.total_pool).toFixed(2)}`,
      },
    } : null);
    await fetchData();
  };

  const totalOpen         = markets.filter(m => m.status === "open").length;
  const totalVolume       = markets.reduce((s, m) => s + Number(m.total_volume), 0);
  const totalKronix       = markets.reduce((s, m) => s + Number(m.kronix_volume), 0);
  const pendingCommission = revenue.filter(r => r.status === "pending")
                                   .reduce((s, r) => s + Number(r.commission_amount), 0);

  const tournamentName = (ptId: string) =>
    kronixTournaments.find(t => t.id === ptId)?.name ?? ptId.slice(0, 8) + "…";

  if (loading) return <p className={styles.loadingText}>CARGANDO MERCADOS...</p>;

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className="font-orbitron" style={{ fontSize: "1.8rem" }}>
            BET <span className="neon-text-cyan">MARKETS</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Mercados de apuestas activos · Revenue share Kronix
          </p>
        </div>
        <button
          className={styles.btnResolve}
          onClick={handleSync}
          disabled={syncing}
          style={{ padding: "0.5rem 1.25rem" }}
        >
          {syncing ? "SINCRONIZANDO..." : "⟳ SYNC KRONIX"}
        </button>
      </div>

      {/* KPI cards */}
      <div className={styles.statsGrid}>
        {[
          { label: "Torneos Kronix",     value: kronixTournaments.length,           color: "#8b5cf6" },
          { label: "Mercados Abiertos",  value: totalOpen,                          color: "#10b981" },
          { label: "Volumen Total",      value: `$${totalVolume.toFixed(2)}`,       color: "#00F5FF" },
          { label: "Comisión Pendiente", value: `$${pendingCommission.toFixed(2)}`, color: "#f59e0b" },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            className={styles.statCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, ease: EASE_OUT }}
            style={{ "--glow-color": `${k.color}33` } as any}
          >
            <div className={styles.glowBg} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <span className={styles.statLabel}>{k.label}</span>
              <div className={styles.statValue} style={{ color: k.color, fontSize: "1.6rem" }}>{k.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0.5rem" }}>
        {(["kronix", "markets", "revenue"] as const).map(t => (
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
            {t === "kronix" ? "TORNEOS KRONIX" : t === "markets" ? "MERCADOS" : "REVENUE KRONIX"}
          </button>
        ))}
      </div>

      {/* Kronix Tournaments */}
      {tab === "kronix" && (
        <motion.div className="glass-panel" style={{ overflow: "hidden" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ease: EASE_OUT }}>
          {kronixTournaments.length === 0 ? (
            <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif" }}>
              No hay torneos con arena_betting_enabled en Kronix todavía.
            </p>
          ) : (
            <table className={styles.withdrawalTable}>
              <thead><tr><th>TORNEO</th><th>ESTADO</th><th>APUESTAS</th><th>VIEWERS</th><th>MERCADOS AC</th></tr></thead>
              <tbody>
                {kronixTournaments.map(t => {
                  const tourMarkets = markets.filter(m => m.pt_tournament_id === t.id);
                  const openMarkets = tourMarkets.filter(m => m.status === "open").length;
                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", color: "white" }}>{t.name}</div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.65rem", marginTop: "2px" }}>{t.slug}</div>
                      </td>
                      <td>
                        <span className={styles.statusBadge} style={{ background: t.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(100,100,100,0.1)", border: `1px solid ${t.status === "active" ? "rgba(16,185,129,0.3)" : "rgba(100,100,100,0.2)"}`, color: t.status === "active" ? "#10b981" : "var(--text-muted)" }}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={styles.statusBadge} style={{ background: `${BETTING_STATUS_COLOR[t.arena_betting_status] ?? "#888"}18`, border: `1px solid ${BETTING_STATUS_COLOR[t.arena_betting_status] ?? "#888"}44`, color: BETTING_STATUS_COLOR[t.arena_betting_status] ?? "#888" }}>
                          {t.arena_betting_status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{t.total_live_viewers ?? 0}</td>
                      <td>
                        {tourMarkets.length === 0 ? (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Sin sync</span>
                        ) : (
                          <span style={{ color: openMarkets > 0 ? "#10b981" : "var(--text-muted)", fontSize: "0.72rem" }}>
                            {openMarkets} abiertos / {tourMarkets.length} total
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.04)", color: "var(--text-muted)", fontSize: "0.72rem" }}>
            Para crear los mercados en AC presiona <strong style={{ color: "#00F5FF" }}>⟳ SYNC KRONIX</strong> — requiere <code>arena_betting_status = open</code>.
          </div>
        </motion.div>
      )}

      {/* Markets table with RESOLVER button */}
      {tab === "markets" && (
        <motion.div className="glass-panel" style={{ overflow: "hidden" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ease: EASE_OUT }}>
          {markets.length === 0 ? (
            <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif" }}>
              Sin mercados. Activa arena_betting_enabled en Kronix y presiona SYNC.
            </p>
          ) : (
            <table className={styles.withdrawalTable}>
              <thead>
                <tr>
                  <th>TORNEO</th>
                  <th>TIPO</th>
                  <th>RONDA</th>
                  <th>ESTADO</th>
                  <th>VOL.</th>
                  <th>RESULTADO</th>
                  <th>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {markets.map(m => (
                  <tr key={m.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>
                      {tournamentName(m.pt_tournament_id)}
                    </td>
                    <td style={{ color: "white", fontFamily: "Orbitron, sans-serif", fontSize: "0.68rem" }}>
                      {MARKET_LABELS[m.market_type] ?? m.market_type}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {m.round_number ? `R${m.round_number}` : "—"}
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: `${STATUS_COLOR[m.status]}18`, border: `1px solid ${STATUS_COLOR[m.status]}44`, color: STATUS_COLOR[m.status] }}>
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: "white", fontWeight: 700 }}>${Number(m.total_volume).toFixed(2)}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>
                      {m.status === "resolved"
                        ? (m.result_pt_player_id ?? m.result_pt_team_id)?.slice(0, 8) + "…"
                        : "—"}
                    </td>
                    <td>
                      {m.status !== "resolved" && m.status !== "canceled" ? (
                        <button
                          onClick={() => openResolve(m)}
                          className={styles.btnResolve}
                          style={{ padding: "0.3rem 0.75rem", fontSize: "0.6rem" }}
                        >
                          RESOLVER
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      )}

      {/* Revenue table */}
      {tab === "revenue" && (
        <motion.div className="glass-panel" style={{ overflow: "hidden" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ease: EASE_OUT }}>
          {revenue.length === 0 ? (
            <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif" }}>
              Sin reportes de revenue aún.
            </p>
          ) : (
            <table className={styles.withdrawalTable}>
              <thead><tr><th>TORNEO</th><th>VOL. TOTAL</th><th>VOL. KRONIX</th><th>COMISIÓN (1%)</th><th>ESTADO</th><th>WEBHOOK</th></tr></thead>
              <tbody>
                {revenue.map(r => (
                  <tr key={r.pt_tournament_id}>
                    <td style={{ color: "white", fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
                      {r.tournament_name ?? r.pt_tournament_id.slice(0, 8) + "…"}
                    </td>
                    <td>${Number(r.total_volume).toFixed(2)}</td>
                    <td style={{ color: "#8b5cf6", fontWeight: 700 }}>${Number(r.kronix_volume).toFixed(2)}</td>
                    <td style={{ color: "#f59e0b", fontWeight: 700 }}>${Number(r.commission_amount).toFixed(2)}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: r.status === "sent" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${r.status === "sent" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`, color: r.status === "sent" ? "#10b981" : "#f59e0b" }}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                      {r.webhook_sent_at ? new Date(r.webhook_sent_at).toLocaleDateString("es-ES") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      )}

      {/* ── Resolve Modal ── */}
      <AnimatePresence>
        {resolveState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 999,
              background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "1rem",
            }}
            onClick={e => { if (e.target === e.currentTarget) setResolve(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ ease: EASE_OUT, duration: 0.2 }}
              style={{
                background: "hsl(var(--bg-secondary))",
                border: "1px solid rgba(0,245,255,0.2)",
                borderRadius: "16px",
                padding: "2rem",
                width: "100%", maxWidth: "480px",
                display: "flex", flexDirection: "column", gap: "1.5rem",
              }}
            >
              {/* Modal header */}
              <div>
                <p style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.55rem", letterSpacing: "0.15em", color: "hsl(var(--text-muted))" }}>
                  RESOLVER MERCADO
                </p>
                <h2 className="font-orbitron" style={{ fontSize: "1rem", marginTop: "0.5rem", color: "white" }}>
                  {MARKET_LABELS[resolveState.market.market_type] ?? resolveState.market.market_type}
                  {resolveState.market.round_number && ` — PARTIDA ${resolveState.market.round_number}`}
                </h2>
                <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.8rem", color: "hsl(var(--text-muted))", marginTop: "0.25rem" }}>
                  Vol. apostado: <strong style={{ color: "#00F5FF" }}>${Number(resolveState.market.total_volume).toFixed(2)}</strong>
                  {" · "}
                  {PLAYER_MARKETS.has(resolveState.market.market_type) ? "Selecciona el jugador ganador" : "Selecciona el equipo ganador"}
                </p>
              </div>

              {/* Result success */}
              {resolveState.result ? (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ fontSize: "2.5rem" }}>✅</div>
                  <div>
                    <p className="font-orbitron" style={{ fontSize: "0.8rem", color: "#10b981", letterSpacing: "0.1em" }}>
                      MERCADO RESUELTO
                    </p>
                    <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.9rem", color: "hsl(var(--text-muted))", marginTop: "0.5rem" }}>
                      {resolveState.result.won} ganaron · {resolveState.result.lost} perdieron · Pool: {resolveState.result.pool}
                    </p>
                  </div>
                  <button onClick={() => setResolve(null)} className="btn-primary" style={{ fontSize: "0.7rem", letterSpacing: "0.12em" }}>
                    CERRAR
                  </button>
                </div>
              ) : resolveState.loading ? (
                <p className="font-orbitron" style={{ textAlign: "center", fontSize: "0.65rem", letterSpacing: "0.15em", color: "hsl(var(--text-muted))", animation: "pulse 1.4s ease-in-out infinite" }}>
                  CARGANDO...
                </p>
              ) : (
                <>
                  {/* Winner selector */}
                  {resolveState.options.length === 0 ? (
                    <p style={{ fontFamily: "Rajdhani, sans-serif", color: "#f87171", fontSize: "0.85rem" }}>
                      No se encontraron opciones en PT para este torneo.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {resolveState.options.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setResolve(prev => prev ? { ...prev, selectedId: opt.id } : null)}
                          style={{
                            padding: "0.75rem 1rem",
                            borderRadius: "10px", cursor: "pointer",
                            background: resolveState.selectedId === opt.id ? "rgba(0,245,255,0.1)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${resolveState.selectedId === opt.id ? "rgba(0,245,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                            color: resolveState.selectedId === opt.id ? "#00F5FF" : "white",
                            fontFamily: "Rajdhani, sans-serif", fontWeight: 700,
                            fontSize: "0.9rem", letterSpacing: "0.04em", textAlign: "left",
                            transition: "all 150ms ease-out",
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {resolveState.error && (
                    <p style={{ color: "#f87171", fontFamily: "Rajdhani, sans-serif", fontSize: "0.82rem" }}>
                      {resolveState.error}
                    </p>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      onClick={() => setResolve(null)}
                      className="btn-secondary"
                      style={{ flex: 1, fontSize: "0.7rem", letterSpacing: "0.1em" }}
                    >
                      CANCELAR
                    </button>
                    <button
                      onClick={handleResolve}
                      disabled={!resolveState.selectedId}
                      className="btn-primary"
                      style={{ flex: 1, fontSize: "0.7rem", letterSpacing: "0.1em", opacity: resolveState.selectedId ? 1 : 0.4 }}
                    >
                      CONFIRMAR RESULTADO
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
