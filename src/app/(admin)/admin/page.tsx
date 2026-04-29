"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, TrendingUp, Users, Wallet, RefreshCw, CheckCircle } from "lucide-react";
import styles from "./admin.module.css";
import { motion } from "framer-motion";
import KronixBalance from "./KronixBalance"
import TestEconomyPanel from "./TestEconomyPanel";

function FeatureTogglesPanel() {
  const [features, setFeatures] = useState<{sports: boolean, gaming: boolean} | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchFeatures() {
      const { data } = await supabase.from('platform_settings').select('value').eq('key', 'features').single();
      if (data && data.value) {
        setFeatures(data.value as {sports: boolean, gaming: boolean});
      }
      setLoading(false);
    }
    fetchFeatures();
  }, []);

  async function toggleFeature(key: 'sports' | 'gaming') {
    if (!features) return;
    setSaving(true);
    const newFeatures = { ...features, [key]: !features[key] };
    const { error } = await supabase.from('platform_settings').update({ value: newFeatures }).eq('key', 'features');
    if (!error) {
      setFeatures(newFeatures);
    }
    setSaving(false);
  }

  if (loading) return null;

  return (
    <div style={{ marginTop: '2rem', background: 'var(--color-bg-card)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '1.25rem' }}>
      <h3 className="font-orbitron" style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>
        MODULE VISIBILITY TOGGLES
      </h3>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => toggleFeature('sports')}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: `1px solid ${features?.sports ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, background: features?.sports ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)', color: features?.sports ? '#22c55e' : '#ef4444', fontFamily: 'Orbitron,sans-serif', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
        >
          {features?.sports ? <CheckCircle size={14} /> : <div style={{width: 14, height: 14, border: '2px solid currentColor', borderRadius: '50%'}} />}
          SPORTS: {features?.sports ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => toggleFeature('gaming')}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: `1px solid ${features?.gaming ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 8, background: features?.gaming ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)', color: features?.gaming ? '#22c55e' : '#ef4444', fontFamily: 'Orbitron,sans-serif', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
        >
          {features?.gaming ? <CheckCircle size={14} /> : <div style={{width: 14, height: 14, border: '2px solid currentColor', borderRadius: '50%'}} />}
          GAMING: {features?.gaming ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  )
}

function SportsSyncPanel() {
  const [running, setRunning]   = useState<string | null>(null)
  const [result, setResult]     = useState<string | null>(null)

  async function runSync(mode: 'open' | 'resolve') {
    setRunning(mode)
    setResult(null)
    try {
      const res = await fetch('/api/admin/sports-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      const data = await res.json()
      const summary = (data.results ?? []).map((r: Record<string,unknown>) =>
        `${r.sport}: ${r.markets_opened ?? r.markets_resolved ?? r.error ?? '?'}`
      ).join(' · ')
      setResult(`✓ ${summary || JSON.stringify(data)}`)
    } catch (e: unknown) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setRunning(null)
    }
  }

  return (
    <div style={{ marginTop: '2rem', background: 'var(--color-bg-card)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '1.25rem' }}>
      <h3 className="font-orbitron" style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>
        SPORTS SYNC MANUAL
      </h3>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => runSync('open')}
          disabled={!!running}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', border: '1px solid rgba(0,245,255,0.3)', borderRadius: 8, background: 'rgba(0,245,255,0.07)', color: '#00F5FF', fontFamily: 'Orbitron,sans-serif', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em', opacity: running ? 0.5 : 1 }}
        >
          <RefreshCw size={12} style={{ animation: running === 'open' ? 'spin 1s linear infinite' : 'none' }} />
          ABRIR PARTIDOS HOY
        </button>
        <button
          onClick={() => runSync('resolve')}
          disabled={!!running}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, background: 'rgba(34,197,94,0.07)', color: '#22c55e', fontFamily: 'Orbitron,sans-serif', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em', opacity: running ? 0.5 : 1 }}
        >
          <CheckCircle size={12} />
          RESOLVER APUESTAS
        </button>
        {result && (
          <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.8rem', color: result.startsWith('✓') ? '#22c55e' : '#ef4444' }}>
            {result}
          </span>
        )}
      </div>
    </div>
  )
}

export default function EconomyDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data, error } = await supabase
        .rpc('get_admin_economy_stats');

      if (!error && data) {
        setStats(data[0]); // supabase rpc returns array or single depending on returns table
      } else if (error) {
        console.error("Error fetching stats:", error.message);
      }
      setLoading(false);
    }

    fetchStats();
  }, []);

  if (loading) return <div>Calculando finanzas...</div>;

  const cards = [
    { 
      label: "Ganancias Totales", 
      value: `$${stats?.total_platform_revenue || 0}`, 
      icon: DollarSign, 
      color: "rgba(139, 92, 246, 0.4)",
      trend: "+12.5% vs last month"
    },
    { 
      label: "Comisión Partidas", 
      value: `$${stats?.total_match_commission || 0}`, 
      icon: TrendingUp, 
      color: "rgba(6, 182, 212, 0.4)"
    },
    { 
      label: "Comisión Torneos", 
      value: `$${stats?.total_tournament_commission || 0}`, 
      icon: Users, 
      color: "rgba(236, 72, 153, 0.4)"
    },
    { 
      label: "Retiros Pendientes", 
      value: `$${stats?.total_pending_withdrawals || 0}`, 
      icon: Wallet, 
      color: "rgba(245, 158, 11, 0.4)",
      warning: stats?.total_pending_withdrawals > 0
    },
  ];

  return (
    <div className={styles.dashboard}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="font-orbitron" style={{ fontSize: '1.8rem' }}>
          PLATFORM <span className="neon-text-purple">ECONOMY</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Vista consolidada de ingresos y flujo de caja de la red.</p>
      </header>

      <div className={styles.statsGrid}>
        {cards.map((card, i) => (
          <motion.div 
            key={card.label} 
            className={styles.statCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{ '--glow-color': card.color } as any}
          >
            <div className={styles.glowBg} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className={styles.statLabel}>{card.label}</span>
                <card.icon size={20} color={card.warning ? '#f59e0b' : 'rgba(255,255,255,0.4)'} />
              </div>
              <div className={styles.statValue}>{card.value}</div>
              {card.trend && (
                <div className={`${styles.statTrend} ${styles.trendUp}`}>
                  {card.trend}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <KronixBalance />

      <FeatureTogglesPanel />

      <SportsSyncPanel />

      <TestEconomyPanel />

      <div style={{ marginTop: '3rem' }}>
        <h3 className="font-orbitron" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>ÚLTIMOS MOVIMIENTOS</h3>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Gráfico de ingresos próximos (Procesando datos de la red...)</p>
          {/* Aquí iría el gráfico de Recharts o SVGs animados */}
          <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '20px' }}>
             {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
               <motion.div 
                 key={i}
                 initial={{ height: 0 }}
                 animate={{ height: `${h}%` }}
                 transition={{ delay: 0.5 + (i * 0.1), duration: 0.8 }}
                 style={{ flex: 1, background: 'linear-gradient(to top, var(--neon-purple), transparent)', borderRadius: '4px 4px 0 0', opacity: 0.6 }}
               />
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
