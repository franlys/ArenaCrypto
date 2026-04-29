"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "./v1-design.css";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function MarketingPage() {
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Track scroll specifically within the 300vh hero section
  const { scrollY, scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end end"]
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (videoRef.current && videoRef.current.duration) {
      // Map scroll progress (0 to 1) to video duration
      videoRef.current.currentTime = latest * videoRef.current.duration;
    }
  });

  // Parallax for tiles
  const y1 = useTransform(scrollY, [0, 1000], [0, -100]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -150]);
  const y3 = useTransform(scrollY, [0, 1000], [0, -80]);
  
  // Platform settings state
  const [features, setFeatures] = useState({ gaming: true, sports: true });

  useEffect(() => {
    // Fetch initial state
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "features")
        .single();
      if (data?.value) {
        setFeatures(data.value);
      }
    };
    fetchSettings();

    // Listen for realtime updates
    const sub = supabase.channel("features-channel")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "platform_settings", filter: "key=eq.features" }, (payload) => {
        setFeatures(payload.new.value);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  const fadeUp = (delay = 0) =>
    reduced ? {} : {
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-60px" },
      transition: { duration: 0.6, delay, ease: EASE_OUT },
    };

  return (
    <div className="ac">
      {/* ---------- HERO ---------- */}
      <section ref={heroRef} className="v1-hero">
        <div className="hero-sticky-container">
          <video 
            ref={videoRef}
          muted 
          playsInline
          preload="auto"
          className="hero-video-bg"
          src="/media/arena_crypto_hero_bgmp_.mp4"
        />
        <div className="hero-gradient-overlay" />

        <div className="v1-tiles">
          {/* Tile 1 */}
          <motion.div style={{ y: y1 }} className="v1-tile cyan t1">
            <div className="mini cyan">CR</div>
            <div>
              <div className="l1">Crash</div>
              <div className="l2">14.72×</div>
            </div>
          </motion.div>
          
          {/* Tile 3 */}
          <motion.div style={{ y: y2 }} className="v1-tile gold t3">
            <div className="mini gold">TW</div>
            <div>
              <div className="l1">Tower · L7</div>
              <div className="l2">64.7×</div>
            </div>
          </motion.div>

          {/* Tile 5 */}
          <motion.div style={{ y: y3 }} className="v1-tile purple t5">
            <div className="mini purple">PL</div>
            <div>
              <div className="l1">Plinko</div>
              <div className="l2">+1,240</div>
            </div>
          </motion.div>

          {/* Tile 2 */}
          <motion.div style={{ y: y1 }} className="v1-tile red t2">
            <div className="mini red">MN</div>
            <div>
              <div className="l1">Mines</div>
              <div className="l2">Boom</div>
            </div>
          </motion.div>
        </div>

        <div className="v1-copy">
          <motion.div className="v1-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <span className="dot" /> 12,847 JUGADORES EN LA ARENA · AHORA
          </motion.div>
          <motion.h1 
            className="h-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
          >
            <span className="stroke">ENTRA</span> <em>A</em><br/>
            LA ARENA<br/>
            DEMUESTRA<br/>
            QUIÉN MANDA
          </motion.h1>
          <motion.p 
            className="lede" 
            style={{ margin: '20px auto 0' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: EASE_OUT }}
          >
            E-sports, juegos de casino provably fair, y matchmaking 1v1. Tu skill es tu ventaja. Pagos instantáneos on-chain.
          </motion.p>
          <motion.div 
            className="v1-cta"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE_OUT }}
          >
            <Link href="/login" className="btn primary xl arrow">ENTRAR AHORA</Link>
          </motion.div>
        </div>
        </div>
      </section>

      {/* ---------- TICKER ---------- */}
      <div className="v1-ticker">
        <div className="v1-ticker-row">
          {[...Array(6)].map((_, i) => (
            <React.Fragment key={i}>
              <div className="winner"><strong>xDragon_77</strong> retiró <span className="ww">$450 USDC</span></div>
              <div className="winner"><strong>NitroAce</strong> ganó en <span className="gg">Crash</span></div>
              <div className="winner"><strong>ShadowFox</strong> venció en <span className="gg">CS2</span></div>
              <div className="winner"><strong>AimGod99</strong> cobró <span className="ww">$1,200 USDC</span></div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ---------- CONDITIONAL GAMES SECTION ---------- */}
      {features.gaming && (
        <section className="section container">
          <motion.div className="eyebrow" {...fadeUp()}>Casino Cripto</motion.div>
          <motion.h2 className="section-title" {...fadeUp(0.1)}>
            JUEGOS QUE PAGAN EN <em>SEGUNDOS</em>
          </motion.h2>
          
          <div className="v1-games">
            <motion.div className="gcard big crash" {...fadeUp(0.2)}>
              <div className="corner"><span className="chip live">EN VIVO · 1,247</span></div>
              <div className="art" />
              <div>
                <div className="name">Crash</div>
                <div className="desc">Entra al cohete. Cada segundo el multiplicador sube. Cobra antes del crash o piérdelo todo.</div>
              </div>
              <div className="mult">8.24×</div>
              <svg className="crash-curve" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,100 Q60,90 100,0" />
              </svg>
            </motion.div>

            <motion.div className="gcard mines" {...fadeUp(0.3)}>
              <div className="corner"><span className="chip red">HOT</span></div>
              <div className="art" />
              <div>
                <div className="name">MINES</div>
                <div className="desc">5×5 grid. Encuentra gemas, evita minas.</div>
              </div>
              <div className="mult" style={{ fontSize: '2.4rem', color: '#F87171' }}>999×</div>
            </motion.div>

            <motion.div className="gcard tower" {...fadeUp(0.4)}>
              <div className="art" />
              <div>
                <div className="name">DRAGON TOWER</div>
                <div className="desc">9 pisos. 5 modos. El dragón te espera.</div>
              </div>
            </motion.div>

            <motion.div className="gcard plinko" {...fadeUp(0.5)} style={{ gridColumn: 'span 2' }}>
              <div className="art" />
              <div>
                <div className="name">PLINKO</div>
                <div className="desc">Lanza la bola, observa rebotar, multiplica.</div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ---------- CONDITIONAL ESPORTS SECTION ---------- */}
      {features.sports && (
        <section className="section container tight">
          <motion.div className="eyebrow cyan" {...fadeUp()}>E-Sports · En vivo</motion.div>
          <motion.h2 className="section-title" {...fadeUp(0.1)}>APUESTA AL <em>MEJOR EQUIPO</em></motion.h2>
          
          <div className="v1-esports">
            <motion.div className="v1-match" {...fadeUp(0.2)}>
              <div className="mhead">
                <div className="game">🏆 CS2 · MAJOR FINAL</div>
                <span className="chip live red">LIVE · MAP 2</span>
              </div>
              <div className="teams">
                <div className="team"><div className="logo" style={{ background:'#FFDD00', color:'#000' }}>NAVI</div><div className="name">Na'Vi</div></div>
                <div className="vs">VS</div>
                <div className="team"><div className="logo" style={{ background:'#000', border:'1px solid #333' }}>G2</div><div className="name">G2</div></div>
              </div>
              <div className="odds">
                <div className="odd"><span className="ol">NAVI</span><span className="ov">1.84</span></div>
                <div className="odd"><span className="ol">Empate</span><span className="ov">−</span></div>
                <div className="odd"><span className="ol">G2</span><span className="ov">2.04</span></div>
              </div>
            </motion.div>
            
            <motion.div className="v1-match" {...fadeUp(0.3)}>
              <div className="mhead">
                <div className="game">⚔️ LOL · WORLDS</div>
                <span className="chip live cyan">LIVE · GAME 3</span>
              </div>
              <div className="teams">
                <div className="team"><div className="logo" style={{ background:'#E3002B', color:'#fff' }}>T1</div><div className="name">T1</div></div>
                <div className="vs">VS</div>
                <div className="team"><div className="logo" style={{ background:'#000', border:'1px solid #A78BFA' }}>GEN</div><div className="name">GEN.G</div></div>
              </div>
              <div className="odds">
                <div className="odd"><span className="ol">T1</span><span className="ov">2.15</span></div>
                <div className="odd"><span className="ol">Empate</span><span className="ov">−</span></div>
                <div className="odd"><span className="ol">GEN</span><span className="ov">1.75</span></div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="section container">
        <motion.div className="eyebrow gold" {...fadeUp()}>El Proceso</motion.div>
        <motion.h2 className="section-title" {...fadeUp(0.1)}>
          DE 0 A GANANCIA EN <em style={{ color: '#F59E0B', textShadow: '0 0 12px rgba(245,158,11,0.35)' }}>MINUTOS</em>
        </motion.h2>

        <div className="v1-how">
          <motion.div className="v1-step" {...fadeUp(0.2)}>
            <div className="num">1</div>
            <h4>Fondea tu wallet</h4>
            <p>Conecta Polygon. Deposita USDC o MATIC instantáneamente sin esperas ni bloqueos.</p>
          </motion.div>
          <motion.div className="v1-step" {...fadeUp(0.3)}>
            <div className="num">2</div>
            <h4>Elige tu arena</h4>
            <p>Juega casino provably fair o apuesta en eventos de E-sports globales.</p>
          </motion.div>
          <motion.div className="v1-step" {...fadeUp(0.4)}>
            <div className="num">3</div>
            <h4>Cobra al instante</h4>
            <p>Tus ganancias van directo a tu wallet. Cero demoras, cero burocracia.</p>
          </motion.div>
        </div>

        <motion.div className="v1-trust" {...fadeUp(0.5)}>
          <div className="tcell">
            <div className="n">1.2<em>K</em>+</div>
            <div className="k">Partidas hoy</div>
          </div>
          <div className="tcell">
            <div className="n">$45<em>K</em>+</div>
            <div className="k">Pagados en 24h</div>
          </div>
          <div className="tcell">
            <div className="n">99.9<em>%</em></div>
            <div className="k">Uptime Smart Contract</div>
          </div>
          <div className="tcell">
            <div className="n">0.5<em>%</em></div>
            <div className="k">Comisión base</div>
          </div>
        </motion.div>
      </section>

      {/* ---------- PROVABLY FAIR ---------- */}
      <section className="section container">
        <div className="v1-fair">
          <div>
            <motion.div className="eyebrow purple" {...fadeUp()}>Transparencia</motion.div>
            <motion.h2 className="section-title" {...fadeUp(0.1)}>
              SISTEMA <em style={{ color: '#A78BFA', textShadow: '0 0 12px rgba(139,92,246,0.35)' }}>PROVABLY FAIR</em>
            </motion.h2>
            <motion.p className="lede" {...fadeUp(0.2)}>
              Cada resultado es verificable. Combinamos un server seed encriptado con tu client seed para generar un hash inmutable. Nadie, ni siquiera nosotros, puede manipular los resultados.
            </motion.p>
          </div>
          <motion.div className="hash-demo" {...fadeUp(0.3)}>
            <div className="hl">Server Seed Hash (SHA-256):</div>
            <div className="hv">a9b8c7d6e5f4g3h2i1j0k9l8m7n6o5p4q3r2s1t0u9v8w7x6y5z4a3b2c1d0e9f8</div>
            <br/>
            <div className="hl">Client Seed:</div>
            <div className="hv">Player123_Nonce42</div>
            <br/>
            <div className="hl">Result (HMAC-SHA256):</div>
            <div className="hv" style={{ color: '#2ECC71' }}>Crash Point: 8.24×</div>
          </motion.div>
        </div>
      </section>

      {/* ---------- FINAL CTA ---------- */}
      <section className="v1-final">
        <motion.h2 className="h-title" {...fadeUp()}>
          EL RING TE <em>ESPERA</em>
        </motion.h2>
        <motion.p className="lede" style={{ margin: '20px auto 30px' }} {...fadeUp(0.1)}>
          Únete a la nueva era de las apuestas competitivas en web3.
        </motion.p>
        <motion.div {...fadeUp(0.2)}>
          <Link href="/login" className="btn primary xl arrow">CREAR CUENTA GRATIS</Link>
        </motion.div>
      </section>
      
      {/* ---------- FOOTER ---------- */}
      <footer className="ac-footer">
        <div>© 2026 ARENACRYPTO BY GONZALEZLABS</div>
        <div style={{ display:'flex', gap:'20px' }}>
          <span>TÉRMINOS</span>
          <span>PRIVACIDAD</span>
          <span>SOPORTE</span>
        </div>
      </footer>
    </div>
  );
}
