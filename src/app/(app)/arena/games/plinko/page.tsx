"use client";
import { useState, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import styles from "./plinko.module.css";

type RiskLevel = "low" | "medium" | "high";
type RowCount  = 8 | 12 | 16;

const MULTIPLIERS: Record<RiskLevel, Record<number, number[]>> = {
  low:    { 8: [5.6,2.1,1.1,1.0,0.5,1.0,1.1,2.1,5.6], 12: [8.9,3.0,1.4,1.1,1.0,0.5,1.0,1.1,1.4,3.0,8.9,0,0], 16: [16,9,2,1.4,1.4,1.2,1.1,1.0,0.5,1.0,1.1,1.2,1.4,1.4,2,9,16] },
  medium: { 8: [13,3,1.3,0.7,0.4,0.7,1.3,3,13], 12: [24,6,2,1.4,0.6,0.4,0.6,1.4,2,6,24,0,0], 16: [110,41,10,5,3,1.5,1.0,0.5,0.3,0.5,1.0,1.5,3,5,10,41,110] },
  high:   { 8: [29,4,1.5,0.3,0.2,0.3,1.5,4,29], 12: [76,10,3,0.6,0.4,0.1,0.4,0.6,3,10,76,0,0], 16: [1000,130,26,9,4,2,0.7,0.2,0.1,0.2,0.7,2,4,9,26,130,1000] },
};

const SLOT_COLORS: Record<RiskLevel, (m: number) => string> = {
  low:    (m) => m >= 5  ? "#00F5FF" : m >= 2 ? "#A78BFA" : m >= 1 ? "#6b7280" : "#ef4444",
  medium: (m) => m >= 10 ? "#00F5FF" : m >= 3 ? "#A78BFA" : m >= 1 ? "#6b7280" : "#ef4444",
  high:   (m) => m >= 50 ? "#00F5FF" : m >= 5 ? "#A78BFA" : m >= 1 ? "#6b7280" : "#ef4444",
};

export default function PlinkoPage() {
  const { profile, isTestUser, refreshProfile } = useUser();

  const balance     = Number(profile?.wallets?.balance_stablecoin ?? 0);
  const testBalance = Number(profile?.wallets?.test_balance        ?? 0);

  const [isTest, setIsTest]   = useState(isTestUser);
  const [amount, setAmount]   = useState(5);
  const [risk, setRisk]       = useState<RiskLevel>("medium");
  const [rows, setRows]       = useState<RowCount>(16);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ slot: number; multiplier: number; payout: number } | null>(null);
  const [ballPos, setBallPos] = useState<number | null>(null);
  const [msg, setMsg]         = useState("");

  const activeBalance = isTest ? testBalance : balance;
  const mults = MULTIPLIERS[risk][rows];

  const dropBall = useCallback(async () => {
    setLoading(true); setMsg(""); setResult(null); setBallPos(null);
    const res = await fetch("/api/games/plinko", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, risk_level: risk, rows, isTest }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setMsg(data.error); return; }
    setBallPos(data.slot);
    setResult(data);
    setMsg(data.multiplier >= 1
      ? `💰 +$${data.payout.toFixed(2)} (${data.multiplier}x)`
      : `📉 $${data.payout.toFixed(2)} (${data.multiplier}x)`);
    refreshProfile();
  }, [amount, risk, rows, isTest, refreshProfile]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={`font-orbitron ${styles.title}`}>⬡ <span className="neon-text-gold">PLINKO</span></h1>
        {/* Balance Toggle */}
        <div className={styles.balanceRow}>
          <button className={`${styles.modeBtn} ${!isTest ? styles.modeBtnActive : ""}`}
            onClick={() => setIsTest(false)} disabled={loading}>
            REAL <span>${balance.toFixed(2)}</span>
          </button>
          <button className={`${styles.modeBtn} ${isTest ? styles.modeBtnActive : ""}`}
            onClick={() => setIsTest(true)} disabled={loading}>
            TEST <span>${testBalance.toFixed(2)}</span>
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.label}>APUESTA</label>
            <div className={styles.amountRow}>
              <input type="number" className={styles.input} value={amount}
                onChange={e => setAmount(Number(e.target.value))} disabled={loading} />
              {[5, 10, 25, 50].map(v => (
                <button key={v} className={styles.pill}
                  onClick={() => setAmount(v)} disabled={loading || v > activeBalance}>${v}</button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>RIESGO</label>
            <div className={styles.riskRow}>
              {(["low","medium","high"] as RiskLevel[]).map(r => (
                <button key={r} className={`${styles.riskBtn} ${risk === r ? styles.riskActive : ""}`}
                  onClick={() => setRisk(r)} disabled={loading}>
                  {r === "low" ? "BAJO" : r === "medium" ? "MEDIO" : "ALTO"}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>FILAS</label>
            <div className={styles.riskRow}>
              {([8,12,16] as RowCount[]).map(r => (
                <button key={r} className={`${styles.riskBtn} ${rows === r ? styles.riskActive : ""}`}
                  onClick={() => setRows(r)} disabled={loading}>{r}</button>
              ))}
            </div>
          </div>

          <button className={styles.btnDrop} onClick={dropBall}
            disabled={loading || amount > activeBalance || amount <= 0}>
            {loading ? "CAYENDO..." : "⬇ SOLTAR BOLA"}
          </button>

          {msg && <p className={`${styles.msg} ${result && result.multiplier >= 1 ? styles.win : styles.lose}`}>{msg}</p>}

          {result && (
            <div className={styles.resultBox}>
              <div className={styles.stat}><span className={styles.statLabel}>MULTIPLICADOR</span><span className={styles.statValue} style={{ color: "#F59E0B" }}>{result.multiplier}x</span></div>
              <div className={styles.stat}><span className={styles.statLabel}>PAGO</span><span className={styles.statValue} style={{ color: result.payout >= amount ? "#22c55e" : "#ef4444" }}>${result.payout.toFixed(2)}</span></div>
            </div>
          )}
        </div>

        <div className={styles.board}>
          <div className={styles.pegsArea}>
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className={styles.pegRow}>
                {Array.from({ length: row + 2 }, (_, i) => (
                  <div key={i} className={styles.peg} />
                ))}
              </div>
            ))}
          </div>
          <div className={styles.slots}>
            {mults.filter((_, i) => i <= rows).map((m, i) => (
              <div key={i} className={`${styles.slot} ${ballPos === i ? styles.slotHit : ""}`}
                style={{ borderColor: SLOT_COLORS[risk](m)+"66", color: SLOT_COLORS[risk](m) }}>
                {m}x
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
