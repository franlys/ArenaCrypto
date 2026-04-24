"use client";

import { useState, useCallback, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { ACGames } from "@/lib/games/engine";
import "./../games-shared.css";
import styles from "./dragon-tower.module.css";

type Difficulty = "easy" | "medium" | "hard" | "expert" | "master";
const MAX_LEVELS = 9;

export default function DragonTowerPage() {
  const { profile, isTestUser, refreshProfile } = useUser();

  const balance = Number(profile?.wallets?.balance_stablecoin ?? 0);
  const testBalance = Number(profile?.wallets?.test_balance ?? 0);

  const [isTest, setIsTest] = useState(isTestUser);
  const [amount, setAmount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [gameId, setGameId] = useState<string | null>(null);
  const [currentLevel, setLevel] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [status, setStatus] = useState<"idle"|"playing"|"dead"|"cashed_out">("idle");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [board, setBoard] = useState<boolean[][] | null>(null);
  const [revealedPath, setRevealedPath] = useState<number[]>([]);

  const activeBalance = isTest ? testBalance : balance;
  const cfg = ACGames.TOWER_MODES[difficulty] || ACGames.TOWER_MODES.medium;

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

  useEffect(() => {
    async function recover() {
      const data = await apiCall({ action: "get-active" });
      if (data?.active) {
        setGameId(data.game_id);
        setDifficulty(data.difficulty as Difficulty);
        setLevel(data.current_level);
        setMultiplier(data.current_multiplier);
        setIsTest(data.is_test);
        setAmount(data.amount);
        setStatus("playing");
        setRevealedPath(data.path || []);
      }
    }
    recover();
  }, [apiCall]);

  const startGame = async () => {
    if (loading || amount > activeBalance || amount <= 0) return;
    setLoading(true); setMsg("");
    const data = await apiCall({ action: "start", amount, difficulty, isTest });
    setLoading(false);
    if (data.error) { setMsg(data.error); return; }
    setGameId(data.game_id);
    setLevel(0); 
    setMultiplier(1);
    setRevealedPath([]);
    setBoard(null);
    setStatus("playing");
  };

  const chooseTile = async (tileIdx: number) => {
    if (status !== "playing" || loading) return;
    setLoading(true);
    const data = await apiCall({ action: "step", game_id: gameId, tile_index: tileIdx });
    
    // Smooth climb delay
    await new Promise(r => setTimeout(r, 300));
    setLoading(false);

    if (data.error) { setMsg(data.error); return; }

    if (!data.survived) {
      setBoard(data.board_full); // If API provides it
      setRevealedPath(prev => {
        if (prev.length > currentLevel) return prev;
        return [...prev, tileIdx];
      });
      setStatus("dead");
      setMsg("QUEMADO");
      refreshProfile();
      return;
    }

    setRevealedPath(prev => {
      if (prev.length > currentLevel) return prev;
      return [...prev, tileIdx];
    });
    setLevel(data.level);
    setMultiplier(data.multiplier);

    if (data.auto_cashout) {
      setStatus("cashed_out");
      setMsg("¡CIMA!");
      refreshProfile();
    }
  };

  const cashOut = async () => {
    if (!gameId || status !== "playing" || currentLevel === 0) return;
    setLoading(true);
    const data = await apiCall({ action: "cashout", game_id: gameId });
    setLoading(false);
    if (data.error) { setMsg(data.error); return; }
    setStatus("cashed_out");
    setMsg("COBRADO");
    refreshProfile();
  };

  const isIdle = status === "idle" || status === "dead" || status === "cashed_out";

  return (
    <div className="gameBody">
      <div className="gameShell">
        <header className="gameTopbar">
          <div className="title">ARENA · <em>DRAGON TOWER</em></div>
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
            <label className="gameLabel">DIFICULTAD</label>
            <select 
              className="gameInput" 
              value={difficulty} 
              onChange={e => setDifficulty(e.target.value as Difficulty)}
              disabled={!isIdle}
            >
              <option value="easy">EASY (3 Seguros)</option>
              <option value="medium">MEDIUM (2 Seguros)</option>
              <option value="hard">HARD (1 Seguro)</option>
              <option value="expert">EXPERT (1 de 3)</option>
              <option value="master">MASTER (1 de 4)</option>
            </select>
          </div>

          {isIdle ? (
            <button className="btnPlay" onClick={startGame} disabled={loading || amount > activeBalance}>
              {loading ? "PROCESANDO..." : "EMPEZAR ASCENSO ›"}
            </button>
          ) : (
            <button className="btnPlay btnCashout" onClick={cashOut} disabled={loading || currentLevel === 0}>
              {loading ? "..." : `COBRAR · ${ACGames.fmtMoney(amount * multiplier)}`}
            </button>
          )}

          <div className={styles.meta}>
             <div className={styles.metaCell}>
               <div className={styles.metaLbl}>NIVEL</div>
               <div className={styles.metaVal} style={{ color: '#00F5FF' }}>{currentLevel} / {MAX_LEVELS}</div>
             </div>
             <div className={styles.metaCell}>
               <div className={styles.metaLbl}>MULT ACTUAL</div>
               <div className={styles.metaVal} style={{ color: '#F59E0B' }}>{multiplier.toFixed(2)}×</div>
             </div>
          </div>
        </aside>

        <section className="gameStage">
          <div className={styles.statusWrap}>
            <div className={`${styles.status} ${!isIdle ? styles.active : ''} ${status === 'dead' ? styles.bad : ''} ${status === 'cashed_out' ? styles.good + ' winAnimate' : ''}`}>
              {status === 'idle' && "ELIGE DIFICULTAD Y EMPIEZA"}
              {status === 'playing' && "ELIGE UN HUEVO · EVITA DRAGONES"}
              {status === 'dead' && "QUEMADO EN NIVEL " + (currentLevel + 1)}
              {status === 'cashed_out' && `¡COBRADO! +${ACGames.fmtMoney(amount * multiplier - amount)}`}
            </div>
          </div>

          <div className={styles.towerWrap}>
            <div className={styles.tower}>
              {Array.from({ length: MAX_LEVELS }, (_, i) => {
                const levelIdx = MAX_LEVELS - 1 - i;
                const isActive = status === 'playing' && currentLevel === levelIdx;
                const isCleared = currentLevel > levelIdx;
                const rowRevealed = revealedPath[levelIdx] !== undefined;
                
                return (
                  <div key={levelIdx} className={`${styles.row} ${isActive ? styles.active : ''} ${isCleared ? styles.cleared + ' winAnimate' : ''}`}>
                    <div className={styles.rowLabel}>{levelIdx + 1}</div>
                    <div className={styles.rowTiles}>
                      {Array.from({ length: cfg.tiles }, (_, tIdx) => {
                        const isPicked = revealedPath[levelIdx] === tIdx;
                        const isDead = status === 'dead' && isPicked;
                        const isSafe = (isPicked && !isDead) || isCleared;
                        
                        return (
                          <button 
                            key={tIdx} 
                            className={`${styles.tile} ${isPicked ? styles.revealed : ''} ${isDead ? styles.dragon : ''} ${isSafe ? styles.safe : ''}`}
                            onClick={() => chooseTile(tIdx)}
                            disabled={!isActive || loading}
                          >
                            <div className={styles.glyph}>
                              {isDead ? '🐉' : '🥚'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className={styles.rowMult}>{ACGames.fmtMult(ACGames.towerMultiplier(levelIdx + 1, difficulty))}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
