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
    async function load() {
      try {
        const res = await fetch("/api/admin/disputes");
        const data = await res.json();
        if (Array.isArray(data)) {
          setDisputes(data);
        } else {
          console.error("API Error:", data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
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
                style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}
              >
                <div className={styles.disputeHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <span className="font-orbitron" style={{ fontSize: "0.9rem", color: "#fff" }}>
                      {d.player1?.username} <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 0.5rem" }}>VS</span> {d.player2?.username}
                    </span>
                    <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                      ID: <span style={{ color: "rgba(255,255,255,0.4)" }}>{d.id}</span> · Apuesta: <span style={{ color: "#00F5FF" }}>${d.stake_amount} USDC</span>
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ 
                      display: "inline-block", padding: "0.3rem 0.75rem", borderRadius: "100px", 
                      fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                      background: d.status === "disputed" ? "rgba(245, 158, 11, 0.1)" : "rgba(0, 245, 255, 0.1)",
                      border: d.status === "disputed" ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(0, 245, 255, 0.3)",
                      color: d.status === "disputed" ? "#F59E0B" : "#00F5FF"
                    }}>
                      {d.status === "disputed" ? "Disputa Abierta" : "Esperando Revisión"}
                    </span>
                  </div>
                </div>

                {/* Evidence Previews */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                  {d.submissions && d.submissions.length > 0 ? (
                    d.submissions.map((sub: any) => (
                      <div key={sub.id} style={{ position: "relative" }}>
                        <p style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                          Subido por: {sub.player_id === d.player1_id ? d.player1?.username : d.player2?.username}
                        </p>
                        <a 
                          href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/evidence/${sub.evidence_url}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className={styles.evidenceLink}
                        >
                          <img 
                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/evidence/${sub.evidence_url}`} 
                            alt="Evidence" 
                            style={{ width: "100%", height: "150px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}
                          />
                        </a>
                      </div>
                    ))
                  ) : (
                    <div style={{ gridColumn: "1 / -1", padding: "2rem", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                      <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.8rem", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                        AÚN NO SE HAN CARGADO EVIDENCIAS PARA ESTA PARTIDA
                      </p>
                    </div>
                  )}
                </div>

                <div className={styles.disputeActions} style={{ display: "flex", alignItems: "center", gap: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    ADJUDICAR VICTORIA:
                  </span>
                  <div style={{ display: "flex", gap: "0.75rem", flex: 1 }}>
                    <button 
                      className="btn-primary" 
                      style={{ flex: 1, padding: "0.6rem", fontSize: "0.65rem" }}
                      onClick={() => resolveDispute(d.id, d.player1_id)}
                    >
                      {d.player1?.username}
                    </button>
                    <button 
                      className="btn-primary" 
                      style={{ flex: 1, padding: "0.6rem", fontSize: "0.65rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                      onClick={() => resolveDispute(d.id, d.player2_id)}
                    >
                      {d.player2?.username}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
