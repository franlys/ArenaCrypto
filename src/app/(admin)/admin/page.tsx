"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, TrendingUp, Users, Wallet } from "lucide-react";
import styles from "./admin.module.css";
import { motion } from "framer-motion";
import KronixBalance from "./KronixBalance";

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
