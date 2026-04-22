"use client";
import { useState, useCallback, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import styles from "./mines.module.css";

const TOTAL_TILES = 25;
type GameState = "idle" | "playing" | "exploded" | "cashed_out";

export default function MinesPage() {
  const { profile, isTestUser, refreshProfile } = useUser();

  const balance     = Number(profile?.wallets?.balance_stablecoin ?? 0);
  const testBalance = Number(profile?.wallets?.test_balance        ?? 0);

  const [isTest, setIsTest]       = useState(isTestUser);
  const [amount, setAmount]       = useState(5);
  const [mineCount, setMineCount] = useState(5);
  const [gameId, setGameId]       = useState<string | null>(null);
  const [revealed, setRevealed]   = useState<number[]>([]);
  const [board, setBoard]         = useState<boolean[] | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [payout, setPayout]       = useState<number | null>(null);
  const [status, setStatus]       = useState<GameState>("idle");
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState("");

  const activeBalance = isTest ? testBalance : balance;

  const apiCall = useCallback(async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    const res = await fetch("/api/games/mines", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }, []);

  // AUTO-RECOVERY: Detect active game on mount
  useEffect(() => {
    async function recover() {
      const data = await apiCall({ action: "get-active" });
      if (data?.active) {
        setGameId(data.game_id);
        setAmount(data.amount);
        setMineCount(data.mines_count);
        setIsTest(data.is_test);
        setRevealed(data.revealed || []);
        setMultiplier(data.current_multiplier || 1);
        setStatus("playing");
      }
    }
    recover();
  }, [apiCall]);

  const startGame = async () => {
    setLoading(true); setMsg("");
    const data = await apiCall({ action: "start", amount, mines_count: mineCount, isTest });
    setLoading(false);
    if (data.error) { setMsg(data.error); return; }
    setGameId(data.game_id);
    setRevealed([]); setBoard(null);
    setMultiplier(1); setPayout(null);
    setStatus("playing");
  };

  const revealTile = async (idx: number) => {
    if (status !== "playing" || revealed.includes(idx) || loading) return;
    setLoading(true);
    const data = await apiCall({ action: "reveal", game_id: gameId, tile_index: idx });
    
    // Suspense delay
    await new Promise(r => setTimeout(r, 350));
    setLoading(false);
    if (data.error) { setMsg(data.error); return; }
    if (data.is_mine) {
      setBoard(data.board); setRevealed(prev => [...prev, idx]);
      setStatus("exploded"); setMsg("💥 ¡Mina! Perdiste tu apuesta.");
      refreshProfile();
    } else {
      setRevealed(prev => [...prev, idx]);
      setMultiplier(data.multiplier);
    }
  };

  const cashOut = async () => {
    if (!gameId || status !== "playing" || revealed.length === 0) return;
    setLoading(true);
    const data = await apiCall({ action: "cashout", game_id: gameId });
    setLoading(false);
    if (data.error) { setMsg(data.error); return; }
    setBoard(data.board); setPayout(data.payout);
    setStatus("cashed_out");
    if (data.status === "cashed_out") {
      const profit = data.payout - amount;
      setMsg(`💰 ¡COBRADO! +$${profit.toFixed(2)}`);
      refreshProfile();
    }
  };

  const getTileState = (idx: number) => {
    if (revealed.includes(idx)) {
      if (board && board[idx]) return "tileMine";
      return "tileGem";
    }
    if (board) return board[idx] ? "tileMineHidden" : "tileGemHidden";
    return "tileHidden";
  };

  const isIdle = status === "idle" || status === "cashed_out" || status === "exploded";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={`font-orbitron ${styles.title}`}>💣 <span className="neon-text-cyan">MINES</span></h1>
        {/* Balance Toggle — mismo patrón que Dice */}
        <div className={styles.balanceRow}>
          {!isTestUser && (
            <button className={`${styles.modeBtn} ${!isTest ? styles.modeBtnActive : ""}`}
              onClick={() => setIsTest(false)} disabled={status !== "idle"}>
              REAL <span>${balance.toFixed(2)}</span>
            </button>
          )}
          <button className={`${styles.modeBtn} ${isTest ? styles.modeBtnActive : ""}`}
            onClick={() => setIsTest(true)} disabled={status !== "idle"}>
            TEST <span>${testBalance.toFixed(2)}</span>
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.label}>APUESTA</label>
            <div className={styles.amountRow}>
              <input type="number" step="0.5" className={styles.input} value={amount}
                onChange={e => setAmount(Number(e.target.value))} disabled={!isIdle} />
              <div className={styles.pillRow}>
                {[5, 10, 25, 50].map(v => (
                  <button key={v} className={styles.pill}
                    onClick={() => setAmount(v)} disabled={!isIdle || v > activeBalance}>${v}</button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>MINAS: {mineCount}</label>
            <input type="range" min={1} max={24} value={mineCount}
              onChange={e => setMineCount(Number(e.target.value))}
              disabled={!isIdle} className={styles.slider} />
            <div className={styles.sliderLabels}><span>1</span><span>24</span></div>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>MULTIPLICADOR</span>
              <span className={styles.statValue} style={{ color: "#00F5FF" }}>{multiplier.toFixed(2)}x</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>GANANCIA POTENCIAL</span>
              <span className={styles.statValue} style={{ color: "#A78BFA" }}>${(amount * multiplier).toFixed(2)}</span>
            </div>
          </div>

          {isIdle ? (
            <button className={styles.btnStart} onClick={startGame}
              disabled={loading || amount > activeBalance || amount <= 0 || amount > 1000}>
              {loading ? "..." : "JUGAR"}
            </button>
          ) : (
            <button className={styles.btnCashout} onClick={cashOut}
              disabled={loading || revealed.length === 0}>
              {loading ? "..." : `COBRAR $${(amount * multiplier).toFixed(2)}`}
            </button>
          )}

          {amount > 1000 && <p style={{ color: '#ef4444', fontSize: '0.75rem', textAlign: 'center', marginTop: '-0.5rem', fontWeight: 600, fontFamily: 'Rajdhani, sans-serif' }}>⚠ Límite máximo: $1,000</p>}
          {msg && <p className={styles.msg}>{msg}</p>}
        </div>

        <div className={styles.board}>
          {Array.from({ length: TOTAL_TILES }, (_, i) => {
            const s = getTileState(i);
            return (
              <button key={i} className={`${styles.tile} ${styles[s]}`}
                onClick={() => revealTile(i)}
                disabled={status !== "playing" || revealed.includes(i)}>
                {s === "tileGem"         && <span className={styles.gem}>💎</span>}
                {s === "tileMine"        && <span className={styles.mineIcon}>💥</span>}
                {s === "tileMineHidden"  && <span className={styles.mineIcon} style={{ opacity: 0.7 }}>💣</span>}
                {s === "tileGemHidden"   && <span className={styles.gem} style={{ opacity: 0.7 }}>💎</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
