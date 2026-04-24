"use client";

import { useState, useCallback, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { ACGames } from "@/lib/games/engine";
import "./../games-shared.css";
import styles from "./mines.module.css";

const TOTAL_TILES = 25;
type GameState = "idle" | "playing" | "exploded" | "cashed_out";

export default function MinesPage() {
  const { profile, isTestUser, refreshProfile } = useUser();

  const balance = Number(profile?.wallets?.balance_stablecoin ?? 0);
  const testBalance = Number(profile?.wallets?.test_balance ?? 0);

  const [isTest, setIsTest] = useState(isTestUser);
  const [amount, setAmount] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [gameId, setGameId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [board, setBoard] = useState<boolean[] | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [status, setStatus] = useState<GameState>("idle");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

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
    if (loading || amount > activeBalance || amount <= 0) return;
    setLoading(true); setMsg("");
    const data = await apiCall({ action: "start", amount, mines_count: mineCount, isTest });
    setLoading(false);
    if (data.error) { setMsg(data.error); return; }
    setGameId(data.game_id);
    setRevealed([]); setBoard(null);
    setMultiplier(1);
    setStatus("playing");
  };

  const revealTile = async (idx: number) => {
    if (status !== "playing" || revealed.includes(idx) || loading) return;
    setLoading(true);
    const data = await apiCall({ action: "reveal", game_id: gameId, tile_index: idx });
    
    // Smooth reveal delay
    await new Promise(r => setTimeout(r, 200));
    setLoading(false);
    
    if (data.error) { setMsg(data.error); return; }
    if (data.is_mine) {
      setBoard(data.board); 
      setRevealed(prev => [...prev, idx]);
      setStatus("exploded");
      setMsg("PERDISTE");
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
    setBoard(data.board);
    setStatus("cashed_out");
    setMsg("¡COBRADO!");
    refreshProfile();
  };

  const getTileClass = (idx: number) => {
    const isRevealed = revealed.includes(idx);
    const isMine = board && board[idx];
    
    if (isRevealed) {
      return isMine ? styles.mine : styles.safe;
    }
    
    if (board) {
      return isMine ? `${styles.mine} ${styles.ghost}` : `${styles.safe} ${styles.ghost}`;
    }
    
    return '';
  };

  const isIdle = status === "idle" || status === "cashed_out" || status === "exploded";

  return (
    <div className="gameBody">
      <div className="gameShell">
        <header className="gameTopbar">
          <div className="title">ARENA · <em>MINES</em></div>
          <div className="bal">
            {ACGames.fmtMoney(activeBalance)} <small>USDC · {isTest ? 'TEST' : 'REAL'}</small>
          </div>
        </header>

        <aside className="gamePanel">
          <div className="gameInputGroup">
            <label className="gameLabel">APUESTA <span className="hint">USDC</span></label>
            <input 
              type="number" 
              className="gameInput" 
              value={amount} 
              onChange={e => setAmount(Number(e.target.value))} 
              disabled={!isIdle}
            />
            <div className={styles.quick}>
              {[1, 10, 50, 100].map(v => (
                <button key={v} className={styles.quickBtn} onClick={() => setAmount(v)} disabled={!isIdle}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="gameInputGroup">
            <label className="gameLabel">
              MINAS <span className="hint" style={{ color: '#F87171' }}>{mineCount} / 25</span>
            </label>
            <div className={styles.sliderWrap}>
              <input 
                type="range" 
                min={1} 
                max={24} 
                value={mineCount}
                onChange={e => setMineCount(Number(e.target.value))}
                disabled={!isIdle}
                className={styles.slider}
              />
              <div className={styles.sliderValues}><span>1</span><span>24</span></div>
            </div>
          </div>

          {isIdle ? (
            <button className="btnPlay" onClick={startGame} disabled={loading || amount > activeBalance}>
              {loading ? "PROCESANDO..." : "EMPEZAR RONDA ›"}
            </button>
          ) : (
            <button className="btnPlay btnCashout" onClick={cashOut} disabled={loading || revealed.length === 0}>
              {loading ? "..." : `COBRAR · ${ACGames.fmtMoney(amount * multiplier)}`}
            </button>
          )}

          <div className={styles.meta}>
             <div className={styles.metaCell}>
               <div className={styles.metaLbl}>MULT ACTUAL</div>
               <div className={styles.metaVal} style={{ color: '#00F5FF' }}>{multiplier.toFixed(2)}×</div>
             </div>
             <div className={styles.metaCell}>
               <div className={styles.metaLbl}>GEMAS</div>
               <div className={styles.metaVal} style={{ color: '#2ECC71' }}>{revealed.length}</div>
             </div>
          </div>
        </aside>

        <section className="gameStage">
          <div className={styles.statusWrap}>
            <div className={`${styles.status} ${!isIdle ? styles.active : ''} ${status === 'exploded' ? styles.bad : ''} ${status === 'cashed_out' ? styles.good : ''}`}>
              {status === 'idle' && "ELIGE MINAS Y EMPIEZA"}
              {status === 'playing' && "ELIGE GEMAS · EVITA MINAS"}
              {status === 'exploded' && "BOOM · PERDISTE"}
              {status === 'cashed_out' && `¡COBRADO! +${ACGames.fmtMoney(amount * multiplier - amount)}`}
            </div>
          </div>

          <div className={styles.grid}>
            {Array.from({ length: TOTAL_TILES }, (_, i) => {
              const tileClass = getTileClass(i);
              const isRevealed = revealed.includes(i);
              return (
                <button 
                  key={i} 
                  className={`${styles.tile} ${tileClass} ${isRevealed ? styles.revealed : ''}`}
                  onClick={() => revealTile(i)}
                  disabled={status !== "playing" || isRevealed}
                >
                  <div className={styles.glyph}>
                    {tileClass.includes(styles.mine) ? '💥' : '◆'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="history-strip" style={{ marginTop: 'auto' }}>
            {/* Historial de rondas podría ir aquí */}
          </div>
        </section>
      </div>
    </div>
  );
}
