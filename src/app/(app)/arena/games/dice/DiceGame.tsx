"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { ACGames } from "@/lib/games/engine";
import "./../games-shared.css";
import styles from "./dice.module.css";

type DiceMode = "over" | "under";

export function DiceGame() {
  const { profile, isTestUser, refreshProfile } = useUser();
  
  // Game State
  const [isTest, setIsTest] = useState(isTestUser);
  const [amount, setAmount] = useState(10);
  const [target, setTarget] = useState(50);
  const [mode, setMode] = useState<DiceMode>("over");
  const [rolling, setRolling] = useState(false);
  const [resultNum, setResultNum] = useState(50.00);
  const [winStatus, setWinStatus] = useState<'win' | 'loss' | null>(null);
  const [history, setHistory] = useState<{ roll: number; win: boolean }[]>([]);
  const [rollsCount, setRollsCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);

  const balance = Number(profile?.wallets?.balance_stablecoin ?? 0);
  const testBalance = Number(profile?.wallets?.test_balance ?? 0);
  const activeBalance = isTest ? testBalance : balance;

  // Probability Math
  const chance = mode === 'over' ? (100 - target) : target;
  const multiplier = (0.99) / (chance / 100);
  const potentialWin = amount * multiplier;

  const handleRoll = async () => {
    if (rolling || amount > activeBalance || amount <= 0) return;
    
    setRolling(true);
    setWinStatus(null);
    const startTs = performance.now();
    const duration = 900;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      const res = await fetch("/api/games/dice/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ amount, target, direction: mode, isTest }),
      });
      const data = await res.json();

      if (data.error) {
        console.error(data.error);
        setRolling(false);
        return;
      }

      // Animate Number Spin
      const animate = (now: number) => {
        const t = Math.min(1, (now - startTs) / duration);
        const e = ACGames.Ease.out(t);
        const jitter = (1 - e) * (Math.random() * 60 - 30);
        const shown = data.result * e + jitter;
        const clamped = Math.max(0, Math.min(100, shown));
        
        setResultNum(clamped);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          setResultNum(data.result);
          setWinStatus(data.won ? 'win' : 'loss');
          setHistory(prev => [{ roll: data.result, win: data.won }, ...prev.slice(0, 14)]);
          setRollsCount(c => c + 1);
          if (data.won) setWinsCount(w => w + 1);
          setRolling(false);
          refreshProfile();
        }
      };
      requestAnimationFrame(animate);

    } catch (err) {
      console.error(err);
      setRolling(false);
    }
  };

  // Slider dragging logic
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const handlePointerMove = (e: React.PointerEvent | PointerEvent) => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : (e as any).touches[0].clientX) - rect.left;
    const pct = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setTarget(Math.round(pct * 100) / 100);
  };

  return (
    <div className="gameBody">
      <div className="gameShell">
        <header className="gameTopbar">
          <div className="title">ARENA · <em>DICE</em></div>
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
              disabled={rolling}
            />
            <div className={styles.quick}>
              {[1, 10, 50, 100].map(v => (
                <button key={v} className={styles.quickBtn} onClick={() => setAmount(v)} disabled={rolling}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="gameInputGroup">
            <label className="gameLabel">MODO</label>
            <div className={styles.modeToggle}>
              <button 
                className={`${styles.modeBtn} ${mode === 'over' ? styles.active : ''}`}
                onClick={() => setMode('over')}
                disabled={rolling}
              >
                ROLL OVER
              </button>
              <button 
                className={`${styles.modeBtn} ${mode === 'under' ? styles.active : ''}`}
                onClick={() => setMode('under')}
                disabled={rolling}
              >
                ROLL UNDER
              </button>
            </div>
          </div>

          <div className="gameInputGroup">
            <label className="gameLabel">OBJETIVO <span className="hint">{mode === 'over' ? '>' : '<'} {target.toFixed(2)}</span></label>
            <input 
              type="number" 
              className="gameInput" 
              value={target} 
              onChange={e => setTarget(Number(e.target.value))} 
              disabled={rolling}
              min={2} max={98} step={0.01}
            />
          </div>

          <button className="btnPlay" onClick={handleRoll} disabled={rolling || amount > activeBalance}>
            {rolling ? "LANZANDO..." : "LANZAR DADOS ›"}
          </button>

          <div className={styles.meta}>
            <div className={styles.metaCell}>
              <div className={styles.metaLbl}>PROB.</div>
              <div className={styles.metaVal}>{chance.toFixed(2)}%</div>
            </div>
            <div className={styles.metaCell}>
              <div className={styles.metaLbl}>MULT.</div>
              <div className={styles.metaVal} style={{ color: '#00F5FF' }}>{multiplier.toFixed(4)}×</div>
            </div>
          </div>
        </aside>

        <section className="gameStage">
          <div className={styles.stageHeader}>
            <div className="stage-meta">
              <span>LANZAMIENTOS <strong>{rollsCount}</strong></span>
              <span>WINS <strong>{winsCount}</strong></span>
            </div>
            <div className="stage-meta">
              <span>HOUSE EDGE <strong>3%</strong></span>
            </div>
          </div>

          <div className={styles.diceDisplay}>
            <div className={`${styles.rollNumber} ${rolling ? styles.spinning : ''} ${winStatus === 'win' ? styles.win + ' winAnimate' : ''} ${winStatus === 'loss' ? styles.loss : ''}`}>
              {resultNum.toFixed(2)}
            </div>
          </div>

          <div className={styles.sliderWrap}>
            <div 
              className={styles.sliderTrack} 
              ref={trackRef}
              onPointerDown={(e) => { setDragging(true); (e.target as any).setPointerCapture(e.pointerId); }}
              onPointerMove={handlePointerMove}
              onPointerUp={() => setDragging(false)}
              style={{
                background: mode === 'under' 
                  ? `linear-gradient(90deg, #2ECC71 0%, #2ECC71 ${target}%, #F87171 ${target}%, #F87171 100%)`
                  : `linear-gradient(90deg, #F87171 0%, #F87171 ${target}%, #2ECC71 ${target}%, #2ECC71 100%)`
              }}
            >
              <div className={`${styles.marker} ${!rolling && winStatus ? styles.show : ''}`} style={{ left: `${resultNum}%` }} />
              <div className={styles.thumb} style={{ left: `${target}%` }} />
            </div>
            <div className={styles.scale}><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
          </div>

          <div className="historyStrip">
            {history.map((h, i) => (
              <span key={i} className={`pill ${h.win ? 'green' : 'red'}`}>
                {h.roll.toFixed(2)}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
