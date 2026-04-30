"use client";

import { useEffect, useRef } from "react";
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
  const { user, loading, isAdmin } = useUser();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ping-pong: play forward then backward smoothly
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let direction = 1; // 1 = forward, -1 = backward
    const SPEED = 0.016; // seconds per frame at ~60fps
    let frameId: number;

    const tick = () => {
      if (!video.duration) {
        frameId = requestAnimationFrame(tick);
        return;
      }
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + direction * SPEED));
      if (video.currentTime >= video.duration) direction = -1;
      if (video.currentTime <= 0) direction = 1;
      frameId = requestAnimationFrame(tick);
    };

    video.muted = true;
    video.load();
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    router.replace(isAdmin ? "/admin" : "/dashboard");
  }, [user, loading, isAdmin, router]);

  if (user) return null; // redirect is handled by the useEffect above

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b' }}>
      <span className="font-orbitron" style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: '#00F5FF', opacity: 0.6 }}>
        CARGANDO...
      </span>
    </div>
  );

  return (
    <div className={styles.wrapper}>
      {/* ── Video: ping-pong loop ── */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        className={styles.videoBg}
        src="/media/a_.mp4"
      />
      <div className={styles.videoOverlay} />

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
        {/* Mobile-only logo */}
        <div className={styles.mobileHeader}>
          <div className={styles.logo}>
            <span className="font-orbitron">ARENA</span>
            <span className={`font-orbitron ${styles.logoCyan}`}>CRYPTO</span>
          </div>
          <p className={styles.mobileTagline}>Compite. Gana. Cobra en cripto.</p>
        </div>

        <AuthTabs />

        {/* Mobile-only stats bar */}
        <div className={styles.mobileStats}>
          <div className={styles.mStat}>
            <span className={`font-orbitron ${styles.mStatVal}`}>1.2K+</span>
            <span className={styles.mStatLbl}>Partidas hoy</span>
          </div>
          <div className={styles.mDivider} />
          <div className={styles.mStat}>
            <span className={`font-orbitron ${styles.mStatVal}`}>$45K+</span>
            <span className={styles.mStatLbl}>Pagados</span>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", opacity: 0.4, userSelect: "none" }}>
          <span className="font-orbitron" style={{ fontSize: "0.5rem", letterSpacing: "0.2em", color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>Powered by</span>
          <span className="font-orbitron" style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", color: "#00F5FF", textTransform: "uppercase", marginTop: "0.2rem" }}>GonzalezLabs</span>
        </div>
      </motion.div>
    </div>
  );
}
