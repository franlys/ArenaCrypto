"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import styles from "./profile.module.css";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function ProfilePage() {
  const { user, profile, isPremium, isAdmin } = useUser();
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("matches")
      .select("id, status, stake_amount, winner_id, created_at, game_id")
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setMatches(data || []);
        setLoadingMatches(false);
      });
  }, [user]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/");
  };

  const wins   = matches.filter((m) => m.winner_id === user?.id).length;
  const losses = matches.filter((m) => m.status === "resolved" && m.winner_id && m.winner_id !== user?.id).length;
  const earned = matches
    .filter((m) => m.winner_id === user?.id)
    .reduce((acc, m) => acc + (m.stake_amount * 1.99 || 0), 0);

  const username = profile?.username || user?.email?.split("@")[0] || "jugador";
  const balance  = profile?.wallets?.balance_stablecoin ?? 0;

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <div className={styles.avatar}>
          {username[0].toUpperCase()}
        </div>
        <div className={styles.headerInfo}>
          <h1 className={`font-orbitron ${styles.username}`}>{username.toUpperCase()}</h1>
          <p className={styles.email}>{user?.email}</p>
          <div className={styles.badges}>
            {isPremium && <span className={styles.badgePremium}>✦ PREMIUM</span>}
            {isAdmin  && <span className={styles.badgeAdmin}>⚙ ADMIN</span>}
          </div>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div
        className={`glass-panel ${styles.statsGrid}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: EASE_OUT }}
      >
        {[
          { val: matches.length,        lbl: "Partidas"  },
          { val: wins,                  lbl: "Victorias" },
          { val: losses,                lbl: "Derrotas"  },
          { val: `$${earned.toFixed(0)}`, lbl: "Ganado" },
        ].map((s) => (
          <div key={s.lbl} className={styles.statBox}>
            <span className={`font-orbitron ${styles.statVal}`}>{s.val}</span>
            <span className={styles.statLbl}>{s.lbl}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Balance ── */}
      <motion.div
        className={`glass-panel ${styles.balanceBox}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.14, ease: EASE_OUT }}
      >
        <span className={styles.balanceLbl}>SALDO ARENA</span>
        <span className={`font-orbitron ${styles.balanceVal}`}>
          {Number(balance).toFixed(2)} <span style={{ color: "hsl(var(--text-muted))", fontSize: "0.8em" }}>USDT</span>
        </span>
      </motion.div>

      {/* ── Partidas recientes ── */}
      <motion.div
        className={styles.matchSection}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: EASE_OUT }}
      >
        <h2 className={`font-orbitron ${styles.sectionTitle}`}>PARTIDAS RECIENTES</h2>

        {loadingMatches ? (
          <p className={styles.empty}>Cargando...</p>
        ) : matches.length === 0 ? (
          <p className={styles.empty}>Sin partidas aún. ¡Entra a la Arena!</p>
        ) : (
          <div className={styles.matchList}>
            {matches.map((m) => {
              const isWin  = m.winner_id === user?.id;
              const isPending = m.status !== "resolved";
              return (
                <div key={m.id} className={styles.matchRow}>
                  <span className={`font-orbitron ${styles.matchGame}`}>{m.game_id || "—"}</span>
                  <span className={styles.matchStake}>${m.stake_amount} USDT</span>
                  <span
                    className={styles.matchResult}
                    style={{ color: isPending ? "hsl(var(--text-muted))" : isWin ? "#10b981" : "#f87171" }}
                  >
                    {isPending ? "EN CURSO" : isWin ? "VICTORIA" : "DERROTA"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Cerrar sesión ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.28, ease: EASE_OUT }}
      >
        <button
          className={styles.btnSignOut}
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? "CERRANDO SESIÓN…" : "⏻  CERRAR SESIÓN"}
        </button>
      </motion.div>
    </div>
  );
}
