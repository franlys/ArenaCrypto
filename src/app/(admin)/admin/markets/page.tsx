"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
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

// Client-side bridge client (uses NEXT_PUBLIC_ vars)
const ptClient = createClient(
  process.env.NEXT_PUBLIC_PT_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_PT_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export default function MarketsPage() {
  const [markets, setMarkets]             = useState<Market[]>([]);
  const [revenue, setRevenue]             = useState<Revenue[]>([]);
  const [kronixTournaments, setKronixT]   = useState<KronixTournament[]>([]);
  const [syncing, setSyncing]             = useState(false);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState<"kronix" | "markets" | "revenue">("kronix");

  const fetchData = async () => {
    const [{ data: m }, { data: r }, { data: kt }] = await Promise.all([
      supabase.from("bet_markets").select("*").order("opened_at", { ascending: false }).limit(50),
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
      await fetch("/api/markets/sync", {
        method: "POST",
        headers: { "x-cron-secret": "" },
      });
      await fetchData();
    } finally {
      setSyncing(false);
    }
  };

  const totalOpen          = markets.filter(m => m.status === "open").length;
  const totalVolume        = markets.reduce((s, m) => s + Number(m.total_volume), 0);
  const totalKronix        = markets.reduce((s, m) => s + Number(m.kronix_volume), 0);
  const pendingCommission  = revenue.filter(r => r.status === "pending")
                                    .reduce((s, r) => s + Number(r.commission_amount), 0);

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
          { label: "Torneos Kronix",     value: kronixTournaments.length,         color: "#8b5cf6" },
          { label: "Mercados Abiertos",  value: totalOpen,                        color: "#10b981" },
          { label: "Volumen Total",      value: `$${totalVolume.toFixed(2)}`,     color: "#00F5FF" },
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
              <div className={styles.statValue} style={{ color: k.color, fontSize: "1.6rem" }}>
                {k.value}
              </div>
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

      {/* Kronix Tournaments table */}
      {tab === "kronix" && (
        <motion.div
          className="glass-panel"
          style={{ overflow: "hidden" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ease: EASE_OUT }}
        >
          {kronixTournaments.length === 0 ? (
            <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif" }}>
              No hay torneos con arena_betting_enabled en Kronix todavía.
            </p>
          ) : (
            <table className={styles.withdrawalTable}>
              <thead>
                <tr>
                  <th>TORNEO</th>
                  <th>ESTADO</th>
                  <th>APUESTAS</th>
                  <th>VIEWERS</th>
                  <th>MERCADOS AC</th>
                </tr>
              </thead>
              <tbody>
                {kronixTournaments.map(t => {
                  const tourMarkets = markets.filter(m => m.pt_tournament_id === t.id);
                  const openMarkets = tourMarkets.filter(m => m.status === "open").length;
                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.72rem", color: "white" }}>
                          {t.name}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.65rem", marginTop: "2px" }}>
                          {t.slug}
                        </div>
                      </td>
                      <td>
                        <span className={styles.statusBadge} style={{
                          background: t.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(100,100,100,0.1)",
                          border: `1px solid ${t.status === "active" ? "rgba(16,185,129,0.3)" : "rgba(100,100,100,0.2)"}`,
                          color: t.status === "active" ? "#10b981" : "var(--text-muted)",
                        }}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={styles.statusBadge} style={{
                          background: `${BETTING_STATUS_COLOR[t.arena_betting_status] ?? "#888"}18`,
                          border: `1px solid ${BETTING_STATUS_COLOR[t.arena_betting_status] ?? "#888"}44`,
                          color: BETTING_STATUS_COLOR[t.arena_betting_status] ?? "#888",
                        }}>
                          {t.arena_betting_status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {t.total_live_viewers ?? 0}
                      </td>
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
            Para crear los mercados en AC presiona <strong style={{ color: "#00F5FF" }}>⟳ SYNC KRONIX</strong> — requiere que el torneo tenga <code>arena_betting_status = open</code>.
          </div>
        </motion.div>
      )}

      {/* Markets table */}
      {tab === "markets" && (
        <motion.div
          className="glass-panel"
          style={{ overflow: "hidden" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ease: EASE_OUT }}
        >
          {markets.length === 0 ? (
            <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif" }}>
              Sin mercados. Activa arena_betting_enabled en Kronix y presiona SYNC.
            </p>
          ) : (
            <table className={styles.withdrawalTable}>
              <thead>
                <tr>
                  <th>TIPO</th>
                  <th>RONDA</th>
                  <th>ESTADO</th>
                  <th>VOL. TOTAL</th>
                  <th>VOL. KRONIX</th>
                  <th>APERTURA</th>
                </tr>
              </thead>
              <tbody>
                {markets.map(m => (
                  <tr key={m.id}>
                    <td style={{ color: "white", fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}>
                      {MARKET_LABELS[m.market_type] ?? m.market_type}
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {m.round_number ? `Ronda ${m.round_number}` : "—"}
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={{
                        background: `${STATUS_COLOR[m.status]}18`,
                        border: `1px solid ${STATUS_COLOR[m.status]}44`,
                        color: STATUS_COLOR[m.status],
                      }}>
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: "white", fontWeight: 700 }}>${Number(m.total_volume).toFixed(2)}</td>
                    <td style={{ color: "#8b5cf6", fontWeight: 700 }}>${Number(m.kronix_volume).toFixed(2)}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {new Date(m.opened_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
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
        <motion.div
          className="glass-panel"
          style={{ overflow: "hidden" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ease: EASE_OUT }}
        >
          {revenue.length === 0 ? (
            <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif" }}>
              Sin reportes de revenue aún. Se generan al finalizar torneos.
            </p>
          ) : (
            <table className={styles.withdrawalTable}>
              <thead>
                <tr>
                  <th>TORNEO</th>
                  <th>VOL. TOTAL</th>
                  <th>VOL. KRONIX</th>
                  <th>COMISIÓN (1%)</th>
                  <th>ESTADO</th>
                  <th>WEBHOOK</th>
                </tr>
              </thead>
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
                      <span className={styles.statusBadge} style={{
                        background: r.status === "sent" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                        border: `1px solid ${r.status === "sent" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                        color: r.status === "sent" ? "#10b981" : "#f59e0b",
                      }}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                      {r.webhook_sent_at
                        ? new Date(r.webhook_sent_at).toLocaleDateString("es-ES")
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
