"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import styles from "./plinko.module.css";

type RiskLevel = "low" | "medium" | "high";
type RowCount  = 8 | 12 | 16;

const MULTIPLIERS: Record<RiskLevel, Record<number, number[]>> = {
  low: {
    8:  [3.2, 1.5, 1.1, 1.0, 0.5, 1.0, 1.1, 1.5, 3.2],
    12: [5.0, 2.0, 1.4, 1.1, 1.0, 0.8, 0.5, 0.8, 1.0, 1.1, 1.4, 2.0, 5.0],
    16: [10, 5.0, 2.0, 1.4, 1.1, 1.0, 1.0, 0.9, 0.5, 0.9, 1.0, 1.0, 1.1, 1.4, 2.0, 5.0, 10],
  },
  medium: {
    8:  [10, 2.5, 1.2, 0.6, 0.3, 0.6, 1.2, 2.5, 10],
    12: [25, 9.0, 3.5, 1.5, 1.0, 0.5, 0.2, 0.5, 1.0, 1.5, 3.5, 9.0, 25],
    16: [80, 30, 8.0, 4.0, 2.0, 1.2, 0.8, 0.4, 0.2, 0.4, 0.8, 1.2, 2.0, 4.0, 8.0, 30, 80],
  },
  high: {
    8:  [25, 3.5, 1.3, 0.3, 0.1, 0.3, 1.3, 3.5, 25],
    12: [120, 20, 6.5, 1.8, 0.6, 0.2, 0.1, 0.2, 0.6, 1.8, 6.5, 20, 120],
    16: [250, 120, 22, 7.5, 3.5, 1.5, 0.4, 0.1, 0.1, 0.1, 0.4, 1.5, 3.5, 7.5, 22, 120, 250],
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
    const startY = 40;
    const rowHeight = 350 / rows; 
    const N = rows + 1; // Total slots
    
    // Start at top
    setBallVisible(true);
    setBallCoord({ x: centerX, y: startY });

    let currentSlotOffset = 0; // Relative to center in terms of slot widths
    let currentY = startY;

    for (let i = 0; i < path.length; i++) {
      await new Promise(r => setTimeout(r, 110));
      const dir = path[i];
      
      // Each step moves the ball 0.5 slots left or right
      if (dir === "R") {
        currentSlotOffset += 0.5;
      } else {
        currentSlotOffset -= 0.5;
      }
      currentY += rowHeight;
      
      // Calculate X based on the center 50% + offset
      // Each slot width is (100% / N) of the container
      const xPercent = 50 + (currentSlotOffset / N) * 100;
      const xPos = (xPercent / 100) * Math.min(500, boardWidth - 48) + (boardWidth - Math.min(500, boardWidth - 48)) / 2;

      setBallCoord({ x: xPos, y: currentY });
      // Identify which peg we hit
      setHitPeg({ row: i, col: Math.round(i/2 + currentSlotOffset) });
      setTimeout(() => setHitPeg(null), 90);
    }

    // Drop to slot center
    const slotEl = slotsRef.current[finalSlot];
    if (slotEl) {
      const rect = slotEl.getBoundingClientRect();
      const bRect = boardRef.current.getBoundingClientRect();
      setBallCoord({ x: rect.left - bRect.left + rect.width / 2, y: currentY + 50 });
    }
    
    await new Promise(r => setTimeout(r, 250));
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
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ amount, risk_level: risk, rows, isTest }),
      });
      const data = await res.json();
      if (data.error) { setMsg(data.error); setLoading(false); return; }

      await animateBall(data.path, data.slot);
      setResult(data);
      const profit = data.payout - amount;
      if (profit > 0) setMsg(`💰 +$${profit.toFixed(2)}`);
      else if (profit === 0) setMsg(`⚖ Empate ($0.00)`);
      else setMsg(`📉 Perdiste -$${Math.abs(profit).toFixed(2)}`);
      refreshProfile();
    } catch (err) { setMsg("Error de conexión"); } finally { setLoading(false); }
  }, [amount, risk, rows, isTest, refreshProfile, loading]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={`font-orbitron ${styles.title}`}>⬡ <span className="neon-text-gold">PLINKO</span></h1>
        <div className={styles.balanceRow}>
          {!isTestUser && (
            <button className={`${styles.modeBtn} ${!isTest ? styles.modeBtnActive : ""}`} onClick={() => setIsTest(false)} disabled={loading}>
              REAL <span>${balance.toFixed(2)}</span>
            </button>
          )}
          <button className={`${styles.modeBtn} ${isTest ? styles.modeBtnActive : ""}`} onClick={() => setIsTest(true)} disabled={loading}>
            TEST <span>${testBalance.toFixed(2)}</span>
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.controls}>
          <div className={styles.controlGroup}><label className={styles.label}>APUESTA</label>
            <div className={styles.amountRow}>
              <input type="number" className={styles.input} value={amount} onChange={e => setAmount(Number(e.target.value))} disabled={loading} />
              <div className={styles.pillRow}>
                {[5, 10, 25, 50].map(v => <button key={v} className={styles.pill} onClick={() => setAmount(v)} disabled={loading || v > activeBalance}>${v}</button>)}
              </div>
            </div>
          </div>
          <div className={styles.controlGroup}><label className={styles.label}>RIESGO</label>
            <div className={styles.riskRow}>{(["low","medium","high"] as RiskLevel[]).map(r => <button key={r} className={`${styles.riskBtn} ${risk === r ? styles.riskActive : ""}`} onClick={() => setRisk(r)} disabled={loading}>{r.toUpperCase()}</button>)}</div>
          </div>
          <div className={styles.controlGroup}><label className={styles.label}>FILAS</label>
            <div className={styles.riskRow}>{([8,12,16] as RowCount[]).map(r => <button key={r} className={`${styles.riskBtn} ${rows === r ? styles.riskActive : ""}`} onClick={() => setRows(r)} disabled={loading}>{r}</button>)}</div>
          </div>
          <button className={styles.btnDrop} onClick={dropBall} disabled={loading || amount > activeBalance || amount <= 0 || amount > 1000}>{loading ? "..." : "⬇ SOLTAR BOLA"}</button>
          {amount > 1000 && <p style={{ color: '#ef4444', fontSize: '0.75rem', textAlign: 'center', marginTop: '-0.5rem', fontWeight: 600, fontFamily: 'Rajdhani, sans-serif' }}>⚠ Límite máximo: $1,000</p>}
          {msg && <p className={`${styles.msg} ${result && result.multiplier >= 1 ? styles.win : styles.lose}`}>{msg}</p>}
        </div>

        <div className={styles.board} ref={boardRef}>
          {ballVisible && <div className={styles.ball} style={{ left: ballCoord.x, top: ballCoord.y }} />}
          <div className={styles.pegsArea}>
            {Array.from({ length: rows }, (_, row) => (
              Array.from({ length: row + 1 }, (_, i) => {
                const xPercent = 50 + (i - (row / 2)) * (100 / (rows + 1));
                return (
                  <div key={`${row}-${i}`} 
                    className={`${styles.peg} ${hitPeg?.row === row && hitPeg?.col === i ? styles.pegHit : ""}`} 
                    style={{ left: `${xPercent}%`, top: `${(row / rows) * 100}%` }} 
                  />
                );
              })
            ))}
          </div>
          <div className={styles.slots} style={{ gridTemplateColumns: `repeat(${rows + 1}, 1fr)` }}>
            {mults.map((m, i) => (
              <div key={i} ref={el => { slotsRef.current[i] = el; }} className={`${styles.slot} ${result?.slot === i && !ballVisible ? styles.slotHit : ""}`} style={{ borderColor: SLOT_COLORS[risk](m)+"44", color: SLOT_COLORS[risk](m) }}>{m}x</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
