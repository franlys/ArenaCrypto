"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Zap, Trophy } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import AuthTabs from "@/components/Auth/AuthTabs";
import styles from "./login.module.css";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

const TRUST = [
  { icon: Shield,  text: "Fondos protegidos en contrato" },
  { icon: Zap,     text: "Pagos instantáneos en Polygon" },
  { icon: Trophy,  text: "IA árbitro sin sesgos" },
];

export default function LoginPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) return null;

  return (
    <div className={styles.wrapper}>
      {/* ── Left panel: branding ── */}
      <motion.div
        className={styles.brand}
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <div className={styles.brandBg} aria-hidden />

        <div className={styles.brandInner}>
          <div className={styles.logo}>
            <span className="font-orbitron">ARENA</span>
            <span className={`font-orbitron ${styles.logoCyan}`}>CRYPTO</span>
          </div>

          <div className={styles.brandCopy}>
            <h2 className={`font-orbitron ${styles.brandHeadline}`}>
              ENTRA AL<br />
              <span className={styles.logoCyan}>RING</span>
            </h2>
            <p className={styles.brandSub}>
              Miles de jugadores ya compiten por cripto real cada día.
              Tu próxima partida empieza aquí.
            </p>
          </div>

          <div className={styles.trustList}>
            {TRUST.map((t) => (
              <div key={t.text} className={styles.trustItem}>
                <t.icon size={15} color="#00F5FF" />
                <span>{t.text}</span>
              </div>
            ))}
          </div>

          <div className={styles.brandStats}>
            {[
              { val: "1.2K+", lbl: "Partidas hoy" },
              { val: "$45K+", lbl: "Pagados" },
            ].map((s) => (
              <div key={s.lbl} className={styles.brandStat}>
                <span className={`font-orbitron ${styles.brandStatVal}`}>{s.val}</span>
                <span className={styles.brandStatLbl}>{s.lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Right panel: form ── */}
      <motion.div
        className={styles.formPanel}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
      >
        <AuthTabs />
      </motion.div>
    </div>
  );
}
