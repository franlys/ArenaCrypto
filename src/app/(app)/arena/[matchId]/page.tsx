"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import ChatRoom from "@/components/Arena/ChatRoom";
import EvidenceUpload from "@/components/Arena/EvidenceUpload";
import styles from "./matchroom.module.css";

const EASE_OUT = [0.23, 1, 0.32, 1];

const STATUS_MAP = {
  active:           { label: "EN COMBATE",          cls: "statusActive"    },
  evidence_pending: { label: "EVIDENCIA PENDIENTE",  cls: "statusPending"   },
  validating:       { label: "VALIDANDO IA",          cls: "statusPending"   },
  resolved:         { label: "RESUELTO",              cls: "statusResolved"  },
  disputed:         { label: "EN DISPUTA",            cls: "statusDisputed"  },
};

export default function MatchRoomPage() {
  const params  = useParams();
  const matchId = Array.isArray(params.matchId) ? params.matchId[0] : params.matchId as string;
  const [matchData, setMatch]  = useState(null);
  const [currentUser, setUser] = useState(null);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: { user } }] = await Promise.all([
        supabase
          .from("matches")
          .select(`
            *,
            player1:profiles!player1_id(id, username, avatar_url),
            player2:profiles!player2_id(id, username, avatar_url)
          `)
          .eq("id", matchId)
          .single(),
        supabase.auth.getUser(),
      ]);
      setMatch(m);
      setUser(user);
      setLoading(false);
    }
    if (matchId) load();
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    const ch = supabase
      .channel("match_status_" + matchId)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "matches",
        filter: "id=eq." + matchId,
      }, (payload) => setMatch((prev) => ({ ...prev, ...payload.new })))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [matchId]);

  if (loading)   return <p className={styles.loading}>CARGANDO SALA DE COMBATE...</p>;
  if (!matchData) return <p className={styles.loading}>PARTIDA NO ENCONTRADA</p>;

  const info  = STATUS_MAP[matchData.status] ?? { label: matchData.status, cls: "statusPending" };
  const prize = ((matchData.stake_amount * 2) - matchData.house_commission).toFixed(2);
  const isPlayer = currentUser && (currentUser.id === matchData.player1?.id || currentUser.id === matchData.player2?.id);

  return (
    <div className={styles.page}>
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <div className={styles.headerLeft}>
          <div className={styles.matchId}>COMBATE EN CURSO // ID: {matchId.slice(0, 8)}</div>
          <h1 className={"font-orbitron " + styles.title}>
            ARENA<span>CRYPTO</span>
          </h1>
          <span className={styles.statusPill + " " + styles[info.cls]}>
            <span className={styles.statusDot} />{info.label}
          </span>
        </div>
        <div className={styles.prizeBox}>
          <span className={styles.prizeLabel}>BOLSA TOTAL:</span>
          <span className={"font-orbitron " + styles.prizeAmount}>${prize} USDC</span>
        </div>
      </motion.header>

      <div className={styles.grid}>
        <aside className={styles.leftCol}>
          <motion.div
            className={"glass-panel " + styles.rulesCard}
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT }}
          >
            <h3 className={styles.sectionTitle}>REGLAS DE LA ARENA</h3>
            <ul className={styles.rulesList}>
              {[
                "El ganador debe subir evidencia clara del resultado final.",
                "Gemini Vision analiza la evidencia y determina el ganador.",
                "Si la confianza de la IA es baja, un árbitro revisa en 24h.",
                "Los fondos se liberan al ganador verificado.",
              ].map((rule, i) => (
                <li key={i} className={styles.ruleItem}>
                  <span className={styles.ruleNum}>{i + 1}.</span>{rule}
                </li>
              ))}
            </ul>
          </motion.div>

          {isPlayer && matchData.status !== "resolved" && (
            <motion.div
              className={"glass-panel " + styles.evidenceCard}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: EASE_OUT }}
            >
              <h3 className={styles.sectionTitle}>SUBIR EVIDENCIA</h3>
              <EvidenceUpload matchId={matchId} playerId={currentUser.id} />
            </motion.div>
          )}

          {isPlayer && (matchData.status === "active" || matchData.status === "disputed") && (
            <motion.div
              className={"glass-panel " + styles.concedeCard}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.25, ease: EASE_OUT }}
              style={{ marginTop: "1rem", border: "1px solid rgba(255, 77, 77, 0.2)", background: "rgba(255, 77, 77, 0.03)" }}
            >
              <h3 className={styles.sectionTitle} style={{ color: "#F87171" }}>HONESTIDAD / FAIR PLAY</h3>
              <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem" }}>
                ¿Has perdido el combate? Sé honesto y libera los fondos a tu rival.
              </p>
              <button 
                className="btn-primary" 
                style={{ width: "100%", background: "transparent", border: "1px solid #F87171", color: "#F87171", fontSize: "0.65rem" }}
                onClick={async () => {
                  if (confirm("⚠️ ADVERTENCIA: ¿Estás seguro de confirmar tu derrota? Esta acción es irreversible y entregará los fondos a tu oponente inmediatamente.")) {
                    const opponentId = currentUser.id === matchData.player1_id ? matchData.player2_id : matchData.player1_id;
                    const { error } = await supabase.rpc("resolve_match", {
                      p_match_id: matchId,
                      p_winner_id: opponentId,
                      p_ai_data: { source: "manual_concede", player_id: currentUser.id }
                    });
                    if (error) {
                      alert("Error: " + error.message);
                    } else {
                      window.location.reload();
                    }
                  }
                }}
              >
                🏳️ CONFIRMAR MI DERROTA
              </button>
            </motion.div>
          )}

          {matchData.status === "resolved" && (
            <motion.div
              className="glass-panel"
              style={{ padding: "1.5rem", textAlign: "center", border: "1px solid rgba(46,204,113,0.3)", background: "rgba(46,204,113,0.05)" }}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🏆</p>
              <h3 className="font-orbitron" style={{ fontSize: "0.75rem", letterSpacing: "0.15em", color: "#2ECC71" }}>
                COMBATE FINALIZADO
              </h3>
              <p style={{ fontFamily: "Rajdhani, sans-serif", color: "rgba(255,255,255,0.4)", marginTop: "0.5rem", fontSize: "0.75rem" }}>
                Los fondos han sido transferidos al ganador.
              </p>
            </motion.div>
          )}
        </aside>

        <main className={styles.mainStage}>
          <motion.div
            className={styles.vsRow}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: EASE_OUT }}
          >
            <div className={styles.competitor}>
              <span className={styles.playerTag}>PLAYER 1</span>
              <span className={"font-orbitron " + styles.playerName}>{matchData.player1?.username}</span>
            </div>
            <div className={styles.vsBadge}>VS</div>
            <div className={styles.competitor}>
              <span className={styles.playerTag}>PLAYER 2</span>
              <span className={"font-orbitron " + styles.playerName}>{matchData.player2?.username}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: EASE_OUT }}
            style={{ marginTop: "1.5rem" }}
          >
            <ChatRoom matchId={matchId} />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
