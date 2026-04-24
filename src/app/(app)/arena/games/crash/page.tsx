"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { ACGames } from "@/lib/games/engine";
import "./../games-shared.css";
import styles from "./crash.module.css";

export default function CrashPage() {
  const { profile, isTestUser, refreshProfile } = useUser();
  const [isTest, setIsTest] = useState(isTestUser);
  const [amount, setAmount] = useState(10);
  const [autoCashout, setAutoCashout] = useState(2.00);
  const [autoEnabled, setAutoEnabled] = useState(false);
  
  // Game State
  const [status, setStatus] = useState<"waiting" | "betting" | "flying" | "crashed">("waiting");
  const [multiplier, setMultiplier] = useState(1.00);
  const [hasBet, setHasBet] = useState(false);
  const [cashedAt, setCashedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const balance = Number(profile?.wallets?.balance_stablecoin ?? 0);
  const testBalance = Number(profile?.wallets?.test_balance ?? 0);
  const activeBalance = isTest ? testBalance : balance;

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Drawing logic
  const drawFrame = useCallback((nowSec: number, mult: number, isCrashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x <= W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();

    const visibleMax = Math.max(2, mult * 1.25);
    const visibleTime = Math.max(6, nowSec * 1.15);
    const px = (t: number) => 40 + (t / visibleTime) * (W - 80);
    const py = (m: number) => (H - 40) - ((m - 1) / (visibleMax - 1)) * (H - 80);

    // Area
    ctx.save();
    const grad = ctx.createLinearGradient(0, 40, 0, H - 40);
    grad.addColorStop(0, isCrashed ? 'rgba(239,68,68,0.2)' : 'rgba(0,245,255,0.2)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(40, H - 40);
    for (let i = 0; i <= 60; i++) {
      const t = (nowSec * i) / 60;
      const m = ACGames.crashMult(t);
      ctx.lineTo(px(t), py(m));
    }
    ctx.lineTo(px(nowSec), H - 40);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Curve
    ctx.save();
    ctx.strokeStyle = isCrashed ? '#F87171' : '#00F5FF';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = isCrashed ? 'rgba(239,68,68,0.5)' : 'rgba(0,245,255,0.5)';
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = (nowSec * i) / 60;
      const m = ACGames.crashMult(t);
      if (i === 0) ctx.moveTo(px(t), py(m)); else ctx.lineTo(px(t), py(m));
    }
    ctx.stroke();
    ctx.restore();

    // Rocket
    const rx = px(nowSec);
    const ry = py(mult);
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = isCrashed ? '#F87171' : '#00F5FF';
    ctx.beginPath();
    ctx.arc(rx, ry, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, []);

  // Sync Canvas Size
  useEffect(() => {
    const handleResize = () => {
      if (!wrapRef.current || !canvasRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = r.width * dpr;
      canvasRef.current.height = r.height * dpr;
      canvasRef.current.style.width = r.width + 'px';
      canvasRef.current.style.height = r.height + 'px';
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Realtime Connection
  useEffect(() => {
    const channel = supabase
      .channel('crash_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crash_rounds' }, (payload) => {
        // New round starting soon
        setRoundId(payload.new.id);
        setStatus("betting");
        setCountdown(5);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crash_rounds' }, (payload) => {
        const { status: newStatus, started_at } = payload.new;
        if (newStatus === 'running') {
          setStatus("flying");
          setCountdown(null);
          // Animation start...
        } else if (newStatus === 'crashed') {
          setStatus("crashed");
          setMultiplier(payload.new.crash_point);
          setHistory(prev => [payload.new.crash_point, ...prev.slice(0, 9)]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Mock Animation Loop (For visualization before API is live)
  useEffect(() => {
    if (status !== "flying") return;
    const start = performance.now();
    let frame: number;
    
    const loop = () => {
      const now = (performance.now() - start) / 1000;
      const m = ACGames.crashMult(now);
      setMultiplier(m);
      drawFrame(now, m, false);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [status, drawFrame]);

  const placeBet = async () => {
    if (amount > activeBalance || amount <= 0) return;
    // API Call to place bet
    setHasBet(true);
    refreshProfile();
  };

  const cashout = async () => {
    if (!hasBet || status !== "flying" || cashedAt) return;
    setCashedAt(multiplier);
    // API Call to cashout
    refreshProfile();
  };

  return (
    <div className="gameBody">
      <div className="gameShell">
        <header className="gameTopbar">
          <div className="title">ARENA · <em>CRASH</em></div>
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
              disabled={hasBet && status === "flying"}
            />
          </div>

          <div className="gameInputGroup">
            <div className={styles.autoHeader}>
              <label className="gameLabel">AUTO CASH-OUT</label>
              <input type="checkbox" checked={autoEnabled} onChange={e => setAutoEnabled(e.target.checked)} />
            </div>
            <input 
              type="number" 
              className="gameInput" 
              value={autoCashout} 
              onChange={e => setAutoCashout(Number(e.target.value))}
              disabled={!autoEnabled}
              step="0.1"
            />
          </div>

          {!hasBet || status === "waiting" || status === "crashed" ? (
            <button className="btnPlay" onClick={placeBet} disabled={status === "flying" || amount > activeBalance}>
              {status === "flying" ? "ESPERANDO SIG. RONDA" : "ENTRAR AL VUELO ›"}
            </button>
          ) : (
            <button className="btnPlay btnCashout" onClick={cashout} disabled={!!cashedAt || status !== "flying"}>
              {cashedAt ? `COBRADO @ ${cashedAt.toFixed(2)}x` : "COBRAR AHORA"}
            </button>
          )}

          <div className={styles.history}>
            <label className="gameLabel">HISTORIAL</label>
            <div className={styles.historyList}>
              {history.map((m, i) => (
                <span key={i} className={`pill ${m < 2 ? 'red' : 'cyan'}`}>{m.toFixed(2)}x</span>
              ))}
            </div>
          </div>
        </aside>

        <section className="gameStage">
          <div className={styles.canvasWrap} ref={wrapRef}>
            <canvas ref={canvasRef} className={styles.canvas} />
            <div className={styles.overlay}>
              <div className={`${styles.mult} ${status === 'crashed' ? styles.crashed : ''} ${cashedAt ? styles.cashed : ''}`}>
                {multiplier.toFixed(2)}x
              </div>
              <div className={styles.status}>
                {status === "waiting" && "CONECTANDO CON EL SERVIDOR..."}
                {status === "betting" && `INICIANDO EN ${countdown}s`}
                {status === "flying" && (cashedAt ? "¡VUELO SEGURO!" : "¡EN EL AIRE!")}
                {status === "crashed" && "CRASHED"}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
