"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { Plus, Play, CheckCircle, Eye } from "lucide-react";
import styles from "../admin.module.css";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const ptClient = createClient(
  process.env.NEXT_PUBLIC_PT_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_PT_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const BETTING_STATUS_COLOR: Record<string, string> = {
  open:   "#10b981",
  closed: "#f87171",
  paused: "#f59e0b",
};

type KronixTournament = {
  id: string; name: string; slug: string; status: string;
  arena_betting_enabled: boolean; arena_betting_status: string;
  total_live_viewers: number; total_matches: number; matches_completed: number;
};

export default function EventManager() {
  const [games, setGames]                   = useState<any[]>([]);
  const [acTournaments, setAcTournaments]   = useState<any[]>([]);
  const [kronixTournaments, setKronixT]     = useState<KronixTournament[]>([]);
  const [loading, setLoading]               = useState(true);
  const [tab, setTab]                       = useState<"kronix" | "ac">("kronix");
  const [form, setForm]                     = useState({
    title: "", game_id: "", entry_fee: 10, max_participants: 8,
  });

  useEffect(() => {
    Promise.all([
      supabase.from("games").select("*").order("name"),
      supabase.from("tournaments").select("*").order("created_at", { ascending: false }),
      ptClient
        .from("tournaments")
        .select("id,name,slug,status,arena_betting_enabled,arena_betting_status,total_live_viewers,total_matches,matches_completed")
        .order("created_at", { ascending: false })
        .limit(30),
    ]).then(([{ data: g }, { data: ac }, { data: kt }]) => {
      setGames(g ?? []);
      setAcTournaments(ac ?? []);
      setKronixT(kt ?? []);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from("tournaments").insert([form]).select();
    if (!error && data) {
      setAcTournaments([data[0], ...acTournaments]);
      setForm({ title: "", game_id: "", entry_fee: 10, max_participants: 8 });
    } else {
      alert("Error al crear torneo: " + error?.message);
    }
  };

  const startTournament = async (id: string) => {
    const { error } = await supabase.rpc("generate_round_robin_matches", { p_tournament_id: id });
    if (!error) window.location.reload();
    else alert("Error al iniciar: " + error.message);
  };

  if (loading) return <p className={styles.loadingText}>CARGANDO EVENTOS...</p>;

  return (
    <div className={styles.dashboard}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className="font-orbitron" style={{ fontSize: "1.8rem" }}>
            EVENT <span className="neon-text-cyan">MANAGER</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Supervisa torneos Kronix y gestiona eventos Arena Crypto.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0.5rem", marginBottom: "1.5rem" }}>
        {(["kronix", "ac"] as const).map(t => (
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
            {t === "kronix" ? `TORNEOS KRONIX (${kronixTournaments.length})` : "ARENA CRYPTO"}
          </button>
        ))}
      </div>

      {/* Kronix tournaments */}
      {tab === "kronix" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {kronixTournaments.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif", padding: "2rem" }}>
              No hay torneos en Kronix todavía.
            </p>
          ) : (
            kronixTournaments.map((t, i) => (
              <motion.div
                key={t.id}
                className="glass-panel"
                style={{ padding: "1.2rem 1.5rem" }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, ease: EASE_OUT }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span className="font-orbitron" style={{ fontSize: "0.9rem", color: "white" }}>
                        {t.name}
                      </span>
                      <span className={styles.statusBadge} style={{
                        background: t.status === "active" ? "rgba(16,185,129,0.1)" : "rgba(100,100,100,0.1)",
                        border: `1px solid ${t.status === "active" ? "rgba(16,185,129,0.3)" : "rgba(100,100,100,0.2)"}`,
                        color: t.status === "active" ? "#10b981" : "var(--text-muted)",
                      }}>
                        {t.status.toUpperCase()}
                      </span>
                      {t.arena_betting_enabled && (
                        <span className={styles.statusBadge} style={{
                          background: `${BETTING_STATUS_COLOR[t.arena_betting_status] ?? "#888"}18`,
                          border: `1px solid ${BETTING_STATUS_COLOR[t.arena_betting_status] ?? "#888"}44`,
                          color: BETTING_STATUS_COLOR[t.arena_betting_status] ?? "#888",
                        }}>
                          APUESTAS {t.arena_betting_status.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: "0.4rem", display: "flex", gap: "1.5rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif" }}>
                        Partidas: {t.matches_completed ?? 0} / {t.total_matches ?? "?"}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "Rajdhani, sans-serif" }}>
                        {t.total_live_viewers ?? 0} viewers
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/admin/events/${t.id}`}
                    className={styles.btnResolve}
                    style={{ padding: "0.45rem 1.1rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.65rem", whiteSpace: "nowrap" }}
                  >
                    <Eye size={13} /> SUPERVISAR
                  </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Arena Crypto local tournaments */}
      {tab === "ac" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}>
          {/* Create form */}
          <div className={styles.eventForm}>
            <h3 className="font-orbitron" style={{ marginBottom: "2rem", fontSize: "1rem" }}>NUEVO TORNEO</h3>
            <form onSubmit={handleCreate}>
              <div className={styles.formGroup}>
                <label>NOMBRE DEL EVENTO</label>
                <input
                  type="text" className={styles.inputField}
                  placeholder="Ej: Copa Diamante Valorant"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>JUEGO</label>
                <select
                  className={`${styles.inputField} ${styles.selectField}`}
                  value={form.game_id}
                  onChange={e => setForm({ ...form, game_id: e.target.value })}
                  required
                >
                  <option value="">Selecciona un juego</option>
                  {games.map(g => (
                    <option key={g.id} value={g.slug}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label>ENTRADA (USDC)</label>
                  <input type="number" className={styles.inputField} value={form.entry_fee}
                    onChange={e => setForm({ ...form, entry_fee: Number(e.target.value) })} required />
                </div>
                <div className={styles.formGroup}>
                  <label>PARTICIPANTES</label>
                  <input type="number" className={styles.inputField} value={form.max_participants}
                    onChange={e => setForm({ ...form, max_participants: Number(e.target.value) })} required />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <Plus size={18} /> CREAR EVENTO
              </button>
            </form>
          </div>

          {/* AC tournaments list */}
          <div>
            <h3 className="font-orbitron" style={{ marginBottom: "2rem", fontSize: "1rem" }}>TORNEOS ARENA</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {acTournaments.map((t, i) => (
                <motion.div
                  key={t.id}
                  className="glass-panel"
                  style={{ padding: "1.2rem" }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 className="font-orbitron" style={{ fontSize: "0.9rem" }}>{t.title}</h4>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {t.game_id?.toUpperCase()} · {t.status}
                      </span>
                    </div>
                    {t.status === "open" ? (
                      <button className="btn-secondary" onClick={() => startTournament(t.id)}
                        style={{ padding: "0.5rem 1rem", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Play size={12} /> INICIAR
                      </button>
                    ) : (
                      <CheckCircle size={18} color="#10b981" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
