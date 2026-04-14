"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";
import styles from "./premium.module.css";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const BENEFITS = [
  { icon: "🚫", title: "Sin Publicidad",       desc: "Experiencia 100% limpia. Sin banners, sin interrupciones." },
  { icon: "🏆", title: "Estatus Élite",         desc: "Badge dorado exclusivo visible en el chat de combate." },
  { icon: "⚡", title: "Validación Prioritaria", desc: "Tus evidencias se procesan antes que los usuarios free." },
  { icon: "🔥", title: "Acceso Anticipado",      desc: "Prueba nuevos modos de juego y torneos antes que nadie." },
];

export default function PremiumPage() {
  const { isPremium, refreshProfile, profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("upgrade_to_premium");
      if (rpcError) throw rpcError;
      await refreshProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const balance = profile?.wallets?.balance_stablecoin ?? 0;

  return (
    <div className={styles.page}>
      <motion.header
        className={styles.header}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <h1 className={`font-orbitron ${styles.title}`}>
          ARENA<span className={styles.goldText}>PREMIUM</span>
        </h1>
        <p className={styles.subtitle}>Desbloquea el verdadero poder de la Arena.</p>
      </motion.header>

      <motion.div
        className={`glass-panel ${styles.card}`}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT }}
      >
        {/* Price */}
        <div className={styles.price}>
          <span className={`font-orbitron ${styles.priceAmount}`}>20</span>
          <span className={styles.priceUnit}>USDT · PAGO ÚNICO</span>
        </div>

        {/* Benefits */}
        <ul className={styles.benefits}>
          {BENEFITS.map((b) => (
            <li key={b.title} className={styles.benefit}>
              <span className={styles.benefitIcon}>{b.icon}</span>
              <span className={styles.benefitText}>
                <strong>{b.title}</strong>: {b.desc}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className={styles.cta}>
          {isPremium ? (
            <div className={styles.activeBadge}>✦ MEMBRESÍA ACTIVA ✦</div>
          ) : (
            <button
              className={styles.btnGold}
              onClick={handleUpgrade}
              disabled={loading}
            >
              {loading ? "PROCESANDO…" : "ADQUIRIR MEMBRESÍA · 20 USDT"}
            </button>
          )}
          {error && (
            <p style={{ fontFamily: "Rajdhani, sans-serif", fontSize: "0.78rem", color: "#ff4d4d", textAlign: "center" }}>
              {error}
            </p>
          )}
          <p className={styles.balanceNote}>
            Tu saldo Arena: <strong>{Number(balance).toFixed(2)} USDT</strong>
            {!isPremium && Number(balance) < 20 && (
              <> · <span style={{ color: "#ff4d4d" }}>Saldo insuficiente</span></>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
