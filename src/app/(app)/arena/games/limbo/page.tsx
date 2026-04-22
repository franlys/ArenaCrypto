"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./limbo.module.css";

export default function LimboPage() {
  const { profile, isTestUser, refreshProfile } = useUser();
  const [isTest, setIsTest] = useState(isTestUser);
  const [amount, setAmount] = useState(5);
  const [target, setTarget] = useState(2.0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [displayMult, setDisplayMult] = useState(1.0);
  const [status, setStatus] = useState<"idle" | "running" | "finished">("idle");
  const [msg, setMsg] = useState("");

  const balance = Number(profile?.wallets?.balance_stablecoin ?? 0);
  const testBalance = Number(profile?.wallets?.test_balance ?? 0);
  const activeBalance = isTest ? testBalance : balance;

  const winProb = (0.96 / target) * 100;

  const apiCall = useCallback(async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch("/api/games/limbo", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }, []);

  const play = async () => {
    if (loading || amount > activeBalance || amount <= 0) return;
    setLoading(true); setMsg(""); setResult(null); setStatus("running");
    
    const data = await apiCall({ amount, target_multiplier: target, isTest });
    
    if (data.error) {
      setMsg(data.error);
      setLoading(false);
      setStatus("idle");
      return;
    }

    // Animation logic
    let start = 1.0;
    const end = data.result;
    const duration = Math.min(1500, Math.max(500, (end / 2) * 100)); // Dynamic speed
    
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Exponential-ish growth for counting
      const current = 1.0 + (end - 1.0) * Math.pow(progress, 2);
      setDisplayMult(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayMult(end);
        setResult(end);
        setStatus("finished");
        setLoading(false);
        if (data.won) {
          const profit = data.payout - amount;
          setMsg(`💰 ¡GANASTE! +$${profit.toFixed(2)}`);
        } else {
          setMsg("❌ Perdiste");
        }
        refreshProfile();
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={`font-orbitron ${styles.title}`}>🚀 <span className="neon-text-cyan">LIMBO</span></h1>
        <div className={styles.balanceRow}>
          <button className={`${styles.modeBtn} ${!isTest ? styles.modeBtnActive : ""}`} onClick={() => setIsTest(false)}>
            REAL <span>${balance.toFixed(2)}</span>
          </button>
          <button className={`${styles.modeBtn} ${isTest ? styles.modeBtnActive : ""}`} onClick={() => setIsTest(true)}>
            TEST <span>${testBalance.toFixed(2)}</span>
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.label}>APUESTA</label>
            <div className={styles.inputRow}>
              <input type="number" className={styles.input} value={amount} 
                onChange={e => setAmount(Number(e.target.value))} disabled={loading} />
              <div className={styles.quickBets}>
                {[5, 10, 25, 50].map(v => (
                  <button key={v} className={styles.pill} onClick={() => setAmount(v)} disabled={loading}>${v}</button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>OBJETIVO (MULTIPLIER)</label>
            <div className={styles.inputRow}>
              <input type="number" step="0.1" className={styles.input} value={target} 
                onChange={e => setTarget(Math.max(1.01, Number(e.target.value)))} disabled={loading} />
              <div className={styles.targetPresets}>
                {[1.5, 2, 5, 10].map(v => (
                  <button key={v} className={styles.pill} onClick={() => setTarget(v)} disabled={loading}>{v}x</button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.info}>
            <div className={styles.infoItem}>
              <span>Probabilidad de ganar:</span>
              <span style={{ color: "#00F5FF" }}>{winProb.toFixed(2)}%</span>
            </div>
          </div>

          <button className={styles.btnPlay} onClick={play} disabled={loading || amount > activeBalance}>
            {loading ? "..." : "JUGAR"}
          </button>

          {msg && <p className={`${styles.msg} ${result && result >= target ? styles.win : styles.lose}`}>{msg}</p>}
        </div>

        <div className={styles.displayArea}>
          <div className={styles.multCard}>
            <AnimatePresence mode="wait">
              <motion.div 
                key={status}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className={styles.multValue}
                style={{ color: status === "finished" ? (result! >= target ? "#22c55e" : "#ef4444") : "#fff" }}
              >
                {displayMult.toFixed(2)}x
              </motion.div>
            </AnimatePresence>
            <div className={styles.rocketContainer}>
              <motion.div 
                className={styles.rocket}
                animate={status === "running" ? { 
                  y: [0, -10, 0], 
                  rotate: [0, -2, 2, 0] 
                } : {}}
                transition={{ duration: 0.4, repeat: Infinity }}
              >
                🚀
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
