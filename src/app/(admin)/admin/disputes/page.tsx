"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "../admin.module.css";
import { motion } from "framer-motion";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase
      .from("matches")
      .select(`
        id, stake_amount, created_at, updated_at,
        player1:profiles!player1_id(username),
        player2:profiles!player2_id(username),
        submissions(id, evidence_url, ai_status, ai_confidence, ai_data, player_id)
      `)
      .eq("status", "disputed")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setDisputes(data ?? []);
        setLoading(false);
      });
  }, []);

  const resolveDispute = async (matchId: string, winnerId: string) => {
    const { error } = await supabase.rpc("resolve_match", {
      p_match_id:  matchId,
      p_winner_id: winnerId,
      p_ai_data:   { source: "manual_admin" },
    });
    if (!error) {
      setDisputes((prev) => prev.filter((d) => d.id !== matchId));
    } else {
      alert("Error: " + error.message);
    }
  };

  if (loading) return <p className={styles.loadingText}>CARGANDO DISPUTAS...</p>;

  return (
    <div className={styles.dashboard}>
      <header className={styles.pageHeader}>
        <h1 className="font-orbitron" style={{ fontSize: "1.8rem" }}>
          DISPUTE <span className="neon-text-cyan">MANAGER</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Partidas donde la IA no alcanzó confianza suficiente. Requieren resolución manual.
        </p>
      </header>

      {disputes.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ fontFamily: "Rajdhani, sans-serif", color: "var(--text-muted)", fontSize: "0.9rem", letterSpacing: "0.1em" }}>
            SIN DISPUTAS ACTIVAS ✓
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {disputes.map((d, i) => {
            const sub = d.submissions?.[0];
            const confidence = sub?.ai_confidence ? Math.round(sub.ai_confidence * 100) : null;

            return (
              <motion.div
                key={d.id}
                className={`glass-panel ${styles.disputeCard}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, ease: EASE_OUT }}
              >
                <div className={styles.disputeHeader}>
                  <div>
                    <span className="font-orbitron" style={{ fontSize: "0.8rem" }}>
                      {d.player1?.username} <span style={{ color: "hsl(var(--text-muted))" }}>vs</span> {d.player2?.username}
                    </span>
                    <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      ID: {d.id.slice(0, 8)}… · Apuesta: ${d.stake_amount} USDC
                    </p>
                  </div>
                  {confidence !== null && (
                    <span style={{
                      fontFamily: "Rajdhani, sans-serif", fontSize: "0.72rem", fontWeight: 700,
                      padding: "0.2rem 0.6rem", borderRadius: "20px",
                      background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)", color: "#ffd700"
                    }}>
                      IA: {confidence}% confianza
                    </span>
                  )}
                </div>

                {sub?.ai_data?.reasoning && (
                  <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.8rem", color: "var(--text-secondary)", padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
                    {sub.ai_data.reasoning}
                  </p>
                )}

                <div className={styles.disputeActions}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                    ADJUDICAR VICTORIA A:
                  </span>
                  <button className={styles.btnResolve} onClick={() => resolveDispute(d.id, d.player1?.id)}>
                    {d.player1?.username}
                  </button>
                  <button className={styles.btnResolve} onClick={() => resolveDispute(d.id, d.player2?.id)}>
                    {d.player2?.username}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
