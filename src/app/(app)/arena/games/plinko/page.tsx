"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import styles from "./plinko.module.css";

type RiskLevel = "low" | "medium" | "high";
type RowCount  = 8 | 12 | 16;

// 8% House Edge Multipliers (Matched with API)
const MULTIPLIERS: Record<RiskLevel, Record<number, number[]>> = {
  low: {
    8:  [5.0, 1.9, 1.1, 1.0, 0.5, 1.0, 1.1, 1.9, 5.0],
    12: [8.0, 2.5, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 2.5, 8.0, 0, 0],
    16: [14, 6, 2, 1.2, 1.2, 1.1, 1, 0.9, 0.5, 0.9, 1, 1.1, 1.2, 1.2, 2, 6, 14],
  },
  medium: {
    8:  [11, 2.5, 1.3, 0.7, 0.4, 0.7, 1.3, 2.5, 11],
    12: [20, 5.0, 1.9, 1.2, 0.6, 0.4, 0.6, 1.2, 1.9, 5.0, 20, 0, 0],
    16: [90, 32, 8, 4, 2, 1.4, 1, 0.5, 0.3, 0.5, 1, 1.4, 2, 4, 8, 32, 90],
  },
  high: {
    8:  [25, 3.5, 1.3, 0.3, 0.2, 0.3, 1.3, 3.5, 25],
    12: [65, 8, 2.5, 0.6, 0.4, 0.1, 0.4, 0.6, 2.5, 8, 65, 0, 0],
    16: [800, 110, 22, 7, 4, 2, 0.6, 0.2, 0.1, 0.2, 0.6, 2, 4, 7, 22, 110, 800],
  }
};

const SLOT_COLORS: Record<RiskLevel, (m: number) => string> = {
  low:    (m) => m >= 5  ? "#00F5FF" : m >= 2 ? "#A78BFA" : m >= 1 ? "#6b7280" : "#ef4444",
  medium: (m) => m >= 10 ? "#00F5FF" : m >= 3 ? "#A78BFA" : m >= 1 ? "#6b7280" : "#ef4444",
  high:   (m) => m >= 50 ? "#00F5FF" : m >= 5 ? "#A78BFA" : m >= 1 ? "#6b7280" : "#ef4444",
};

export default function PlinkoPage() {
  const { profile, isTestUser, refreshProfile } = useUser();
  const boardRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<(HTMLDivElement | null)[]>([]);

  const balance     = Number(profile?.wallets?.balance_stablecoin ?? 0);
  const testBalance = Number(profile?.wallets?.test_balance        ?? 0);

  const [isTest, setIsTest]   = useState(isTestUser);
  const [amount, setAmount]   = useState(5);
  const [risk, setRisk]       = useState<RiskLevel>("medium");
  const [rows, setRows]       = useState<RowCount>(16);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ slot: number; multiplier: number; payout: number } | null>(null);
  const [msg, setMsg]         = useState("");
  
  // Animation state
  const [ballVisible, setBallVisible] = useState(false);
  const [ballCoord, setBallCoord]     = useState({ x: 0, y: 0 });
  const [hitPeg, setHitPeg]           = useState<{row: number, col: number} | null>(null);

  const activeBalance = isTest ? testBalance : balance;
  const mults = MULTIPLIERS[risk][rows];

  const animateBall = async (path: string[], finalSlot: number) => {
    if (!boardRef.current) return;
    
    const boardWidth = boardRef.current.clientWidth;
    const centerX = boardWidth / 2;
    const startY = 32;
    const rowHeight = 18; 
    
    // Dynamic pegGap based on board width and number of rows
    // Last row has rows+1 pegs. We want to space them evenly.
    const availableWidth = boardWidth - 48; // 1.5rem padding
    const slotWidth = availableWidth / (rows + 1);
    const pegGap = slotWidth; 

    // Start exactly at the top peg center
    setBallVisible(true);
    setBallCoord({ x: centerX - 7, y: startY });

    let currentX = centerX - 7;
    let currentY = startY;
    let currentSlot = 0;

    for (let i = 0; i < path.length; i++) {
      await new Promise(r => setTimeout(r, 90));
      const dir = path[i];
      const jitter = (Math.random() - 0.5) * 3;

      if (dir === "R") {
        currentX += pegGap / 2;
        currentSlot++;
      } else {
        currentX -= pegGap / 2;
      }
      currentY += rowHeight;
      
      setBallCoord({ x: currentX + jitter, y: currentY });
      setHitPeg({ row: i, col: currentSlot });
      setTimeout(() => setHitPeg(null), 80);
    }

    // Final alignment to exact slot center using REFS
    const slotEl = slotsRef.current[finalSlot];
    if (slotEl && boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      const slotRect = slotEl.getBoundingClientRect();
      const finalX = slotRect.left - boardRect.left + (slotRect.width / 2) - 7;
      setBallCoord({ x: finalX, y: currentY + 55 });
    } else {
      // Fallback if refs fail
      const availableWidth = boardWidth - 48;
      const slotWidth = availableWidth / (rows + 1);
      const slotX = 24 + (finalSlot * slotWidth) + (slotWidth / 2) - 7;
      setBallCoord({ x: slotX, y: currentY + 55 });
    }
    
    await new Promise(r => setTimeout(r, 200));
    setBallVisible(false);
  };

  const dropBall = useCallback(async () => {
    if (loading) return;
    setLoading(true); setMsg(""); setResult(null);
    
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      const res = await fetch("/api/games/plinko", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ amount, risk_level: risk, rows, isTest }),
      });
      const data = await res.json();
      
      if (data.error) {
        setMsg(data.error);
        setLoading(false);
        return;
      }

      // Start animation
      await animateBall(data.path, data.slot);

      setResult(data);
      setMsg(data.multiplier >= 1
        ? `💰 +$${data.payout.toFixed(2)} (${data.multiplier}x)`
        : `📉 $${data.payout.toFixed(2)} (${data.multiplier}x)`);
      
      refreshProfile();
    } catch (err) {
      setMsg("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [amount, risk, rows, isTest, refreshProfile, loading]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={`font-orbitron ${styles.title}`}>⬡ <span className="neon-text-gold">PLINKO</span></h1>
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

          {msg && <p className={`${styles.msg} ${result && result.multiplier >= 1 ? styles.win : styles.lose} ${styles.payoutMsg}`}>{msg}</p>}
        </div>

        <div className={styles.board} ref={boardRef}>
          {ballVisible && (
            <div className={styles.ball} style={{ left: ballCoord.x, top: ballCoord.y }} />
          )}

          <div className={styles.pegsArea}>
            {Array.from({ length: rows + 1 }, (_, row) => (
              <div key={row} className={styles.pegRow}>
                {Array.from({ length: row + 1 }, (_, i) => (
                  <div key={i} className={`${styles.peg} ${hitPeg?.row === row && hitPeg?.col === i ? styles.pegHit : ""}`} />
                ))}
              </div>
            ))}
          </div>

          <div className={styles.slots} style={{ 
            gridTemplateColumns: `repeat(${rows + 1}, 1fr)`,
            padding: `0 ${(boardRef.current?.clientWidth ?? 600) / (rows + 1) / 2}px` 
          }}>
            {mults.filter((_, i) => i <= rows).map((m, i) => (
              <div key={i} 
                ref={el => { slotsRef.current[i] = el; }}
                className={`${styles.slot} ${result?.slot === i && !ballVisible ? styles.slotHit : ""}`}
                style={{ 
                  borderColor: SLOT_COLORS[risk](m)+"66", 
                  color: SLOT_COLORS[risk](m),
                }}>
                {m}x
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
