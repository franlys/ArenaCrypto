"use client";
import { useState, useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import styles from "./dragon-tower.module.css";

type Difficulty = "easy" | "medium" | "hard" | "expert";

const DIFFICULTY_CONFIG: Record<Difficulty, { tiles: number; label: string; color: string }> = {
  easy:   { tiles: 4, label: "FÁCIL",   color: "#22c55e" },
  medium: { tiles: 3, label: "MEDIO",   color: "#F59E0B" },
  hard:   { tiles: 2, label: "DIFÍCIL", color: "#f97316" },
  expert: { tiles: 2, label: "EXPERTO", color: "#ef4444" },
};

const LEVEL_MULTIPLIERS: Record<Difficulty, number[]> = {
  easy:   [1.20,1.44,1.73,2.07,2.49,2.98,3.58,4.30,5.16],
  medium: [1.40,1.96,2.75,3.85,5.39,7.55,10.57,14.80,20.72],
  hard:   [1.88,3.52,6.64,12.49,23.49,44.14,83.00,156.0,293.0],
  expert: [3.60,12.96,46.66,168.0,604.0,0,0,0,0],
};

const MAX_LEVELS = 9;
type TileState = "hidden" | "selected" | "safe" | "mine";

export default function DragonTowerPage() {
  const { profile, isTestUser, refreshProfile } = useUser();

  const balance     = Number(profile?.wallets?.balance_stablecoin ?? 0);
  const testBalance = Number(profile?.wallets?.test_balance        ?? 0);

  const [isTest, setIsTest]         = useState(isTestUser);
  const [amount, setAmount]         = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [gameId, setGameId]         = useState<string | null>(null);
  const [currentLevel, setLevel]    = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [payout, setPayout]         = useState<number | null>(null);
  const [status, setStatus]         = useState<"idle"|"playing"|"dead"|"cashed_out">("idle");
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState("");
  const [tileStates, setTileStates] = useState<TileState[][]>([]);

  const activeBalance = isTest ? testBalance : balance;
  const cfg   = DIFFICULTY_CONFIG[difficulty];
  const mults = LEVEL_MULTIPLIERS[difficulty];

  const apiCall = useCallback(async (body: object) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch("/api/games/dragon-tower", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }, []);

  const initBoard = (diff: Difficulty) =>
    Array.from({ length: MAX_LEVELS }, () =>
      Array(DIFFICULTY_CONFIG[diff].tiles).fill("hidden") as TileState[]);

  const startGame = async () => {
    setLoading(true); setMsg("");
    const data = await apiCall({ action: "start", amount, difficulty, isTest });
    setLoading(false);
    if (data.error) { setMsg(data.error); return; }
    setGameId(data.game_id);
    setLevel(0); setMultiplier(1); setPayout(null);
    setTileStates(initBoard(difficulty));
    setStatus("playing");
  };

  const chooseTile = async (tileIndex: number) => {
    if (status !== "playing" || loading) return;
    setLoading(true);
    const data = await apiCall({ action: "step", game_id: gameId, tile_index: tileIndex });
    setLoading(false);
    if (data.error) { setMsg(data.error); return; }

    const newBoard = tileStates.map(row => [...row]);
    const boardRow = MAX_LEVELS - currentLevel - 1;

    if (!data.survived) {
      newBoard[boardRow][tileIndex] = "mine";
      for (let t = 0; t < cfg.tiles; t++) {
        if (newBoard[boardRow][t] === "hidden") newBoard[boardRow][t] = "safe";
      }
      setTileStates(newBoard);
      setStatus("dead");
      setMsg("💀 ¡Mina! Perdiste tu apuesta.");
      refreshProfile();
      return;
    }

    newBoard[boardRow][tileIndex] = "selected";
    setTileStates(newBoard);
    setLevel(data.level);
    setMultiplier(data.multiplier);

    if (data.auto_cashout) {
      setPayout(data.payout);
      setStatus("cashed_out");
      setMsg(`🏆 ¡Cima alcanzada! +$${data.payout.toFixed(2)}`);
      refreshProfile();
    }
  };

  const cashOut = async () => {
    if (!gameId || status !== "playing" || currentLevel === 0) return;
    setLoading(true);
    const data = await apiCall({ action: "cashout", game_id: gameId });
    setLoading(false);
    if (data.error) { setMsg(data.error); return; }
    setPayout(data.payout);
    setStatus("cashed_out");
    setMsg(`💰 Cobrado! +$${data.payout.toFixed(2)} (${data.multiplier}x)`);
    refreshProfile();
  };

  const isIdle = status === "idle" || status === "dead" || status === "cashed_out";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={`font-orbitron ${styles.title}`}>🐉 <span className="neon-text-purple">DRAGON TOWER</span></h1>
        {/* Balance Toggle — mismo patrón que Dice */}
        <div className={styles.balanceRow}>
          <button className={`${styles.modeBtn} ${!isTest ? styles.modeBtnActive : ""}`}
            onClick={() => setIsTest(false)} disabled={!isIdle}>
            REAL <span>${balance.toFixed(2)}</span>
          </button>
          <button className={`${styles.modeBtn} ${isTest ? styles.modeBtnActive : ""}`}
            onClick={() => setIsTest(true)} disabled={!isIdle}>
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
                onChange={e => setAmount(Number(e.target.value))} disabled={!isIdle} />
              {[5,10,25,50].map(v => (
                <button key={v} className={styles.pill}
                  onClick={() => setAmount(v)} disabled={!isIdle || v > activeBalance}>${v}</button>
              ))}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label className={styles.label}>DIFICULTAD</label>
            <div className={styles.diffGrid}>
              {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(d => (
                <button key={d}
                  className={`${styles.diffBtn} ${difficulty === d ? styles.diffActive : ""}`}
                  style={difficulty === d ? { borderColor: DIFFICULTY_CONFIG[d].color, color: DIFFICULTY_CONFIG[d].color } : {}}
                  onClick={() => setDifficulty(d)} disabled={!isIdle}>
                  {DIFFICULTY_CONFIG[d].label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.statsPanel}>
            <div className={styles.stat}><span className={styles.statLabel}>NIVEL</span><span className={styles.statValue}>{currentLevel} / {MAX_LEVELS}</span></div>
            <div className={styles.stat}><span className={styles.statLabel}>MULTIPLICADOR</span><span className={styles.statValue} style={{ color: "hsl(270,80%,70%)" }}>{multiplier.toFixed(2)}x</span></div>
            <div className={styles.stat}><span className={styles.statLabel}>GANANCIA POTENCIAL</span><span className={styles.statValue} style={{ color: "#22c55e" }}>${(amount * multiplier).toFixed(2)}</span></div>
          </div>

          {isIdle ? (
            <button className={styles.btnStart} onClick={startGame}
              disabled={loading || amount > activeBalance || amount <= 0}>
              {loading ? "..." : "⚔ INICIAR"}
            </button>
          ) : (
            <button className={styles.btnCashout} onClick={cashOut}
              disabled={loading || currentLevel === 0}>
              {loading ? "..." : `💰 COBRAR $${(amount * multiplier).toFixed(2)}`}
            </button>
          )}

          {msg && <p className={`${styles.msg} ${status === "cashed_out" ? styles.win : status === "dead" ? styles.lose : ""}`}>{msg}</p>}
        </div>

        <div className={styles.tower}>
          {Array.from({ length: MAX_LEVELS }, (_, i) => {
            const levelNum = MAX_LEVELS - i;
            const boardIdx = i;
            const isActive = status === "playing" && currentLevel === levelNum - 1;
            const isPast   = currentLevel >= levelNum;
            const mult = mults[levelNum - 1];

            return (
              <div key={i} className={`${styles.towerRow} ${isActive ? styles.rowActive : ""} ${isPast ? styles.rowPast : ""}`}>
                <div className={styles.rowMeta}>
                  <span className={styles.rowLevel}>{levelNum}</span>
                  <span className={styles.rowMult} style={{ color: cfg.color }}>{mult > 0 ? `${mult}x` : "—"}</span>
                </div>
                <div className={styles.rowTiles}>
                  {Array.from({ length: cfg.tiles }, (_, t) => {
                    const ts = tileStates[boardIdx]?.[t] ?? "hidden";
                    return (
                      <button key={t}
                        className={`${styles.tile} ${styles[`tile_${ts}`]}`}
                        onClick={() => chooseTile(t)}
                        disabled={!isActive || loading}>
                        {ts === "selected" && "✓"}
                        {ts === "mine"     && "💥"}
                        {ts === "safe"     && "✓"}
                        {ts === "hidden"   && "?"}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
