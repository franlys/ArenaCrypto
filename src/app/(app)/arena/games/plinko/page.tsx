"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import { ACGames } from "@/lib/games/engine";
import "./../games-shared.css";
import styles from "./plinko.module.css";

type RiskLevel = "low" | "med" | "high";
type RowCount = 8 | 10 | 12 | 14 | 16;

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  done: boolean;
  bet: number;
  trail: { x: number; y: number }[];
  bucket?: number;
  settledAt?: number;
  path: string[];
  step: number;
}

export default function PlinkoPage() {
  const { profile, isTestUser, refreshProfile } = useUser();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game State
  const [isTest, setIsTest] = useState(isTestUser);
  const [amount, setAmount] = useState(10);
  const [risk, setRisk] = useState<RiskLevel>("low");
  const [rows, setRows] = useState<RowCount>(12);
  const [loading, setLoading] = useState(false);
  const [drops, setDrops] = useState(0);
  const [best, setBest] = useState(0);
  const [history, setHistory] = useState<{ mult: number; color: string }[]>([]);
  const [activeBallsCount, setActiveBallsCount] = useState(0);

  const balance = Number(profile?.wallets?.balance_stablecoin ?? 0);
  const testBalance = Number(profile?.wallets?.test_balance ?? 0);
  const activeBalance = isTest ? testBalance : balance;

  // Internal Physics Refs
  const ballsRef = useRef<Ball[]>([]);
  const lastTimeRef = useRef<number>(0);
  const layoutRef = useRef<any>({});
  const pegsRef = useRef<{ x: number; y: number }[]>([]);

  // Constants
  const GRAV = 900;
  const RESTITUTION = 0.55;
  const FRICTION = 0.998;

  const updateLayout = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const W = canvas.width;
    const H = canvas.height;
    const topPad = 40 * dpr;
    const botPad = 50 * dpr;
    
    // We want the pyramid to be "square" (spacingX = spacingY)
    // and fit within both W and H
    const availableH = H - topPad - botPad;
    const availableW = W - 40 * dpr;
    
    const spacingY = availableH / (rows + 1);
    const spacingX = availableW / (rows + 2);
    
    const s = Math.min(spacingX, spacingY);
    const sx = s;
    const sy = s;
    const cx = W / 2;

    layoutRef.current = {
      W, H, topPad, botPad, sx, sy, cx, dpr,
      pegR: 2.5 * dpr,
      ballR: 5 * dpr,
      bucketCount: rows + 1,
      bucketH: s * 0.85,
      bucketsY: topPad + rows * sy + 15 * dpr
    };

    // Recalculate pegs
    const newPegs = [];
    for (let r = 0; r < rows; r++) {
      const count = r + 3;
      const y = topPad + r * sy;
      const offset = (count - 1) / 2;
      for (let i = 0; i < count; i++) {
        const x = cx + (i - offset) * sx;
        newPegs.push({ x, y });
      }
    }
    pegsRef.current = newPegs;
  }, [rows]);

  useEffect(() => {
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [updateLayout]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const L = layoutRef.current;
    if (!L.W) return;

    ctx.clearRect(0, 0, L.W, L.H);

    // Draw Pegs
    pegsRef.current.forEach(p => {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, L.pegR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(p.x - L.pegR * 0.3, p.y - L.pegR * 0.3, L.pegR * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Buckets
    const payouts = ACGames.PLINKO_PAYOUTS[rows][risk];
    for (let i = 0; i < L.bucketCount; i++) {
      const v = payouts[i];
      const count = L.bucketCount;
      const offset = (count - 1) / 2;
      const x = L.cx + (i - offset) * L.sx;
      const w = L.sx * 0.88;
      const h = L.bucketH;
      const color = ACGames.getBucketColor(v);
      
      // Check if any ball just landed here
      const isHighlighted = ballsRef.current.some(b => b.done && b.bucket === i && (performance.now() - (b.settledAt || 0)) < 400);

      ctx.fillStyle = color;
      ctx.globalAlpha = isHighlighted ? 0.6 : 0.15;
      
      // Round rect helper
      ctx.beginPath();
      ctx.roundRect(x - w / 2, L.bucketsY, w, h, 6 * L.dpr);
      ctx.fill();
      
      if (isHighlighted) {
        ctx.shadowBlur = 20 * L.dpr;
        ctx.shadowColor = color;
      }

      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = (isHighlighted ? 3 : 1) * L.dpr;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = isHighlighted ? '#fff' : color;
      ctx.font = `${isHighlighted ? 900 : 700} ${Math.min(L.sx * 0.28, 13 * L.dpr)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(v + '×', x, L.bucketsY + h/2);
    }

    // Draw Balls
    ballsRef.current.forEach(b => {
      // Trail
      if (b.trail) {
        b.trail.forEach((t, i) => {
          const alpha = (i / b.trail.length) * 0.4;
          ctx.fillStyle = `rgba(0,245,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, L.ballR * (0.3 + 0.7 * i / b.trail.length), 0, Math.PI * 2);
          ctx.fill();
        });
      }
      // Ball Grad
      const grad = ctx.createRadialGradient(b.x - L.ballR * 0.3, b.y - L.ballR * 0.4, 0, b.x, b.y, L.ballR);
      grad.addColorStop(0, '#fff');
      grad.addColorStop(0.4, '#00F5FF');
      grad.addColorStop(1, '#0891B2');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, L.ballR, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [rows, risk]);

  const tick = useCallback((ts: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const dt = lastTimeRef.current ? Math.min(0.05, (ts - lastTimeRef.current) / 1000) : 0;
    lastTimeRef.current = ts;

    const L = layoutRef.current;
    if (!L.W) return;

    // Physics Step
    ballsRef.current.forEach(b => {
      if (b.done) return;

      // FORCED PATH LOGIC: Sync visuals with server result
      const currentRow = Math.floor((b.y - L.topPad) / L.sy);
      if (currentRow >= 0 && currentRow < rows && b.step === currentRow) {
        const dir = b.path[b.step];
        const kick = (dir === 'R' ? 1 : -1) * (20 + Math.random() * 10) * L.dpr;
        b.vx = kick;
        b.step++;
      }

      b.vy += GRAV * L.dpr * dt;
      b.vx *= FRICTION;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Collide Pegs
      pegsRef.current.forEach(p => {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const d2 = dx * dx + dy * dy;
        const r = L.pegR + L.ballR;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 0.0001;
          const nx = dx / d, ny = dy / d;
          const overlap = r - d;
          b.x += nx * overlap;
          b.y += ny * overlap;
          const vdotn = b.vx * nx + b.vy * ny;
          if (vdotn < 0) {
            b.vx -= (1 + RESTITUTION) * vdotn * nx;
            b.vy -= (1 + RESTITUTION) * vdotn * ny;
            b.vx += (Math.random() - 0.5) * 20 * L.dpr;
          }
        }
      });

      // Wall bounds
      const marginX = 10 * L.dpr;
      if (b.x < marginX) { b.x = marginX; b.vx = Math.abs(b.vx) * 0.5; }
      if (b.x > L.W - marginX) { b.x = L.W - marginX; b.vx = -Math.abs(b.vx) * 0.5; }

      // Trail
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 6) b.trail.shift();

      // Landed?
      if (b.y > L.bucketsY) {
        const xRel = b.x - L.cx;
        const count = L.bucketCount;
        const offset = (count - 1) / 2;
        let idx = Math.round(xRel / L.sx + offset);
        idx = Math.max(0, Math.min(count - 1, idx));
        b.bucket = idx;
        b.done = true;
        b.settledAt = performance.now();
        
        // Finalize payout 
        refreshProfile(); // Sync test/real balance after landed
        
        const mult = ACGames.PLINKO_PAYOUTS[rows][risk][idx];
        setHistory(prev => [{ mult, color: ACGames.getBucketColor(mult) }, ...prev.slice(0, 11)]);
        if (mult > best) setBest(mult);
      }
    });

    // Prune settled balls
    const now = performance.now();
    ballsRef.current = ballsRef.current.filter(b => !b.done || (now - (b.settledAt || 0)) < 700);
    setActiveBallsCount(ballsRef.current.filter(b => !b.done).length);

    draw(ctx);
    requestAnimationFrame(tick);
  }, [rows, risk, draw, best]);

  useEffect(() => {
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  const handleDrop = async () => {
    if (loading || amount > activeBalance || amount <= 0) return;
    
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      const res = await fetch("/api/games/plinko", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ amount, risk_level: risk === 'med' ? 'medium' : risk, rows, isTest }),
      });
      const data = await res.json();
      
      if (data.error) {
        console.error(data.error);
        setLoading(false);
        return;
      }

      // Add ball to physics engine
      const L = layoutRef.current;
      const jitter = (Math.random() - 0.5) * L.sx * 0.3;
      ballsRef.current.push({
        x: L.cx + jitter,
        y: L.topPad - 20 * L.dpr,
        vx: (Math.random() - 0.5) * 30 * L.dpr,
        vy: 0,
        done: false,
        bet: amount,
        trail: [],
        path: data.path,
        step: 0
      });

      setDrops(d => d + 1);
      refreshProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gameBody">
      <div className="gameShell">
        <header className="gameTopbar">
          <div className="title">ARENA · <em>PLINKO</em></div>
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
              disabled={loading}
            />
            <div className={styles.quick}>
              {[1, 10, 50, 100].map(v => (
                <button key={v} className={styles.quickBtn} onClick={() => setAmount(v)} disabled={loading}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="gameInputGroup">
            <label className="gameLabel">RIESGO</label>
            <div className={styles.toggle}>
              {(['low', 'med', 'high'] as RiskLevel[]).map(r => (
                <button 
                  key={r} 
                  className={`${styles.toggleBtn} ${risk === r ? styles.active : ''} ${styles[r]}`}
                  onClick={() => setRisk(r)}
                  disabled={loading}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="gameInputGroup">
            <label className="gameLabel">FILAS <span className="hint">{rows}</span></label>
            <div className={styles.rowToggle}>
              {[8, 10, 12, 14, 16].map(r => (
                <button 
                  key={r} 
                  className={`${styles.rowBtn} ${rows === r ? styles.active : ''}`}
                  onClick={() => setRows(r as RowCount)}
                  disabled={loading}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button className="btnPlay" onClick={handleDrop} disabled={loading || amount > activeBalance}>
            {loading ? "PROCESANDO..." : "SOLTAR BOLA ›"}
          </button>
          
          <div className={styles.stats}>
            BOLAS ACTIVAS · <strong style={{ color: '#fff' }}>{activeBallsCount}</strong>
          </div>
        </aside>

        <section className="gameStage">
          <div className={styles.stageHeader}>
            <div className="stage-meta">
              <span>DROPS <strong>{drops}</strong></span>
              <span>MEJOR <strong>{best > 0 ? best + '×' : '—'}</strong></span>
            </div>
            <div className="stage-meta">
              <span>HOUSE EDGE <strong>3%</strong></span>
            </div>
          </div>

          <div className={styles.canvasContainer} ref={containerRef}>
            <canvas ref={canvasRef} className={styles.canvas} />
          </div>

          <div className="historyStrip">
            {history.map((h, i) => (
              <span key={i} className="pill" style={{ 
                background: h.color + '15', 
                color: h.color, 
                borderColor: h.color + '40' 
              }}>
                {h.mult}×
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
