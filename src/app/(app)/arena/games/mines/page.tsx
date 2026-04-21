"use client";
import { useState, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import styles from "./mines.module.css";

const TOTAL_TILES = 25;

type GameState = "idle" | "playing" | "exploded" | "cashed_out";

export default function MinesPage() {
  const { profile } = useUser();
  const isTestUser = profile?.is_test_user ?? false;
  const [amount, setAmount] = useState(5);
  const [mineCount, setMineCount] = useState(5);
  const [gameId, setGameId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [board, setBoard] = useState<boolean[] | null>(null); // null until game ends
  const [multiplier, setMultiplier] = useState(1);
  const [payout, setPayout] = useState<number | null>(null);
  const [status, setStatus] = useState<GameState>("idle");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token;

  const apiCall = useCallback(async (body: object) => {
    const token = await getToken();
    const res = await fetch("/api/games/mines", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.json();
  }, []);

  const startGame = async () => {
    setLoading(true); setMsg("");
    const data = await apiCall({ action: "start", amount, mines_count: mineCount });
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
    setLoading(false);
    if (data.error) { setMsg(data.error); return; }
    if (data.is_mine) {
      setBoard(data.board); setRevealed(prev => [...prev, idx]);
      setStatus("exploded"); setMsg("💥 ¡Mina! Perdiste tu apuesta.");
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
    setBoard(data.board);
    setPayout(data.payout);
    setStatus("cashed_out");
    setMsg(`💰 ¡Cobrado! +$${data.payout.toFixed(2)}`);
  };

  const getTileState = (idx: number) => {
    if (revealed.includes(idx)) {
      if (board && board[idx]) return "mine";
      return "gem";
    }
    if (board) {
      return board[idx] ? "mine-hidden" : "gem-hidden";
    }
    return "hidden";
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h1 className={`font-orbitron ${styles.title}`}>💣 <span className="neon-text-cyan">MINES</span></h1>
          {isTestUser && (
            <span style={{
              fontFamily: "Rajdhani,sans-serif", fontSize: "0.65rem", fontWeight: 800,
              letterSpacing: "0.12em", padding: "0.2rem 0.6rem", borderRadius: 4,
              background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.35)",
              color: "#00F5FF",
            }}>MODO PRUEBA</span>
          )}
        </div>
        <p className={styles.subtitle}>
          Descubre gemas. Evita minas. Cobra cuando quieras.
          {isTestUser && <span style={{ color: "rgba(0,245,255,0.6)", marginLeft: "0.5rem" }}>· Usando saldo de prueba</span>}
        </p>
      </div>

      <div className={styles.layout}>
        {/* Control panel */}
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.label}>APUESTA (USDC)</label>
            <div className={styles.amountRow}>
              <input type="number" className={styles.input} value={amount}
                onChange={e => setAmount(Number(e.target.value))} disabled={status === "playing"} />
              {[5, 10, 25, 50].map(v => (
                <button key={v} className={styles.pill} onClick={() => setAmount(v)}
                  disabled={status === "playing"}>${v}</button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>MINAS: {mineCount}</label>
            <input type="range" min={1} max={24} value={mineCount}
              onChange={e => setMineCount(Number(e.target.value))}
              disabled={status === "playing"} className={styles.slider} />
            <div className={styles.sliderLabels}><span>1</span><span>24</span></div>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>MULTIPLICADOR</span>
              <span className={styles.statValue} style={{ color: "#00F5FF" }}>{multiplier.toFixed(2)}x</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>GANANCIA POTENCIAL</span>
              <span className={styles.statValue} style={{ color: "#A78BFA" }}>
                ${(amount * multiplier).toFixed(2)}
              </span>
            </div>
          </div>

          {status === "idle" || status === "cashed_out" || status === "exploded" ? (
            <button className={styles.btnStart} onClick={startGame} disabled={loading}>
              {loading ? "..." : "JUGAR"}
            </button>
          ) : (
            <button className={styles.btnCashout} onClick={cashOut}
              disabled={loading || revealed.length === 0}>
              {loading ? "..." : `COBRAR $${(amount * multiplier).toFixed(2)}`}
            </button>
          )}

          {msg && <p className={styles.msg}>{msg}</p>}
        </div>

        {/* Board */}
        <div className={styles.board}>
          {Array.from({ length: TOTAL_TILES }, (_, i) => {
            const s = getTileState(i);
            return (
              <button key={i} className={`${styles.tile} ${styles[s]}`}
                onClick={() => revealTile(i)}
                disabled={status !== "playing" || revealed.includes(i)}>
                {s === "gem"         && <span className={styles.gem}>💎</span>}
                {s === "mine"        && <span className={styles.mineIcon}>💥</span>}
                {s === "mine-hidden" && <span className={styles.mineIcon}>💣</span>}
                {s === "gem-hidden"  && <span className={styles.gem}>💎</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
