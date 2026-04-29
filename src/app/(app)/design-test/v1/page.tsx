"use client";
import React from 'react';

const HTML_CONTENT = `
<!-- Home v1 â€” 3D Tilted Arena -->
<div class="home-v1" data-screen-label="Home v1 Â· 3D Arena">
<div class="mesh-bg"></div>
<div class="scanlines"></div>

<!-- NAV -->
<nav class="ac-nav">
  <div class="brand">
    <svg viewBox="0 0 32 32" fill="none"><path d="M4 26 L16 4 L28 26 Z M11 20 H21 M9 26 H23" stroke="#00F5FF" stroke-width="2.5" stroke-linejoin="round"/></svg>
    <span>ARENA<em>Â·</em>CRYPTO</span>
  </div>
  <div class="links">
    <a class="on" href="#">Arena</a>
    <a href="#">E-Sports</a>
    <a href="#">Casino</a>
    <a href="#">CÃ³mo Funciona</a>
    <a href="#">Provably Fair</a>
  </div>
  <div class="actions">
    <a class="btn ghost" href="#">Iniciar SesiÃ³n</a>
    <a class="btn primary" href="#">Crear Cuenta</a>
  </div>
</nav>

<!-- HERO -->
<section class="v1-hero">
  <div class="v1-stage">
    <div class="v1-floor"></div>
    <div class="v1-horizon"></div>
  </div>

  <div class="v1-tiles">
    <div class="v1-tile cyan t1"><div class="mini cyan">â†—</div><div><div class="l1">CRASH</div><div class="l2">14.72Ã—</div></div></div>
    <div class="v1-tile gold t2"><div class="mini gold">â—Ž</div><div><div class="l1">NAVI vs G2</div><div class="l2">1.84</div></div></div>
    <div class="v1-tile purple t3"><div class="mini purple">â–½</div><div><div class="l1">PLINKO</div><div class="l2">+1,240</div></div></div>
    <div class="v1-tile red t4"><div class="mini red">â—ˆ</div><div><div class="l1">MINES Â· 5</div><div class="l2">9.30Ã—</div></div></div>
    <div class="v1-tile cyan t5"><div class="mini cyan">â–³</div><div><div class="l1">TOWER Â· L7</div><div class="l2">64.7Ã—</div></div></div>
    <div class="v1-tile gold t6"><div class="mini gold">â—Ž</div><div><div class="l1">T1 vs GEN</div><div class="l2">2.15</div></div></div>
  </div>

  <div class="v1-copy">
    <div class="v1-meta"><span class="dot"></span>12,847 jugadores en la arena Â· ahora</div>
    <h1 class="h-title"><span class="stroke">ENTRA</span> <em>A LA ARENA</em><br/>DEMUESTRA QUIÃ‰N MANDA</h1>
    <p class="lede" style="margin: 26px auto 0; text-align: center;">E-sports, juegos casino provably fair, y matchmaking 1v1. Tu skill es tu ventaja. Pagos instantÃ¡neos on-chain.</p>

    <div class="v1-cta">
      <a href="#" class="btn primary xl arrow">CREAR CUENTA</a>
      <a href="#" class="btn ghost xl">EXPLORAR JUEGOS</a>
    </div>

    <div class="v1-stats">
      <div class="stat"><div class="v">\$42.8M</div><div class="l">PAGADO 24H</div></div>
      <div class="stat"><div class="v">12.8K</div><div class="l">JUGADORES AHORA</div></div>
      <div class="stat"><div class="v">1.8M+</div><div class="l">APUESTAS TOTAL</div></div>
      <div class="stat"><div class="v">99.1%</div><div class="l">RTP VERIFIED</div></div>
    </div>
  </div>
</section>

<!-- TICKER -->
<div class="v1-ticker">
  <div class="v1-ticker-row" id="tickerRow">
    <!-- filled by JS -->
  </div>
</div>

<!-- FEATURED GAMES -->
<section class="section container">
  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
    <div>
      <div class="eyebrow">CASINO Â· PROVABLY FAIR</div>
      <h2 class="section-title" style="margin-top: 8px;">Juegos que <em>pagan en segundos</em></h2>
    </div>
    <a href="#" class="btn ghost">VER TODOS â†’</a>
  </div>

  <div class="v1-games">
    <div class="gcard big crash">
      <div class="art">
        <svg class="crash-curve" viewBox="0 0 400 300" preserveAspectRatio="none">
          <defs><linearGradient id="cg1" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#00F5FF" stop-opacity="0"/><stop offset="1" stop-color="#00F5FF" stop-opacity="1"/></linearGradient></defs>
          <g class="grid"><line x1="0" y1="60" x2="400" y2="60"/><line x1="0" y1="120" x2="400" y2="120"/><line x1="0" y1="180" x2="400" y2="180"/><line x1="0" y1="240" x2="400" y2="240"/></g>
          <path d="M0 290 Q 180 270, 260 180 T 400 20" stroke="url(#cg1)"/>
          <circle cx="400" cy="20" r="5" fill="#00F5FF" filter="drop-shadow(0 0 8px #00F5FF)"/>
        </svg>
      </div>
      <div class="corner">
        <span class="chip cyan live">EN VIVO Â· 1,247</span>
      </div>
      <div class="mult">8.24Ã—</div>
      <div>
        <div class="name">Crash</div>
        <div class="desc">Entra al cohete. Cada segundo el multiplicador sube. Cobra antes del crash â€” o piÃ©rdelo todo.</div>
        <a class="btn primary" href="#" style="margin-top: 18px;">JUGAR AHORA â†’</a>
      </div>
    </div>

    <div class="gcard mines">
      <div class="corner"><span class="chip red">HOT</span></div>
      <div class="name" style="margin-top: 40px;">Mines</div>
      <div class="desc">5Ã—5 grid. Encuentra gemas, evita minas.</div>
      <div style="font-family: var(--font-display); font-size: 2rem; font-weight: 900; color: #F87171; text-shadow: 0 0 14px rgba(239,68,68,0.4);">999Ã—</div>
    </div>

    <div class="gcard plinko">
      <div class="corner"><span class="chip purple">NEW</span></div>
      <div class="name" style="margin-top: 40px;">Plinko</div>
      <div class="desc">FÃ­sica real. 16 filas, 3 niveles de riesgo.</div>
      <div style="font-family: var(--font-display); font-size: 2rem; font-weight: 900; color: #A78BFA; text-shadow: 0 0 14px rgba(139,92,246,0.4);">1,000Ã—</div>
    </div>

    <div class="gcard tower" style="grid-column: 2 / span 2;">
      <div class="corner"><span class="chip gold">POPULAR</span></div>
      <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
        <div>
          <div class="name">Dragon Tower</div>
          <div class="desc">9 pisos. 5 modos. El dragÃ³n te espera.</div>
        </div>
        <div style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 900; color: #F59E0B; text-shadow: 0 0 14px rgba(245,158,11,0.4);">8,000Ã—</div>
      </div>
    </div>
  </div>
</section>

<!-- E-SPORTS -->
<section class="section container" style="padding-top: 36px;">
  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
    <div>
      <div class="eyebrow purple">E-SPORTS Â· EN VIVO</div>
      <h2 class="section-title" style="margin-top: 8px;">Apuesta al <em>mejor equipo</em></h2>
    </div>
    <a href="#" class="btn ghost">VER TODOS LOS MATCHES â†’</a>
  </div>

  <div class="v1-esports">
    <div class="v1-match">
      <div class="mhead">
        <div class="game">ðŸŽ¯ CS2 Â· MAJOR FINAL</div>
        <span class="chip red live">LIVE Â· MAP 2</span>
      </div>
      <div class="teams">
        <div class="team"><div class="logo" style="background: rgba(245,158,11,0.15); color: #F59E0B;">NAVI</div><div class="name">Na'Vi</div></div>
        <div class="vs">VS</div>
        <div class="team"><div class="logo" style="background: rgba(0,245,255,0.15); color: #00F5FF;">G2</div><div class="name">G2</div></div>
      </div>
      <div class="odds">
        <div class="odd"><div class="ol">NAVI</div><div class="ov">1.84</div></div>
        <div class="odd"><div class="ol">EMPATE</div><div class="ov">â€”</div></div>
        <div class="odd"><div class="ol">G2</div><div class="ov">2.04</div></div>
      </div>
    </div>

    <div class="v1-match">
      <div class="mhead">
        <div class="game">ðŸ† LOL Â· WORLDS</div>
        <span class="chip cyan live">LIVE Â· GAME 3</span>
      </div>
      <div class="teams">
        <div class="team"><div class="logo" style="background: rgba(239,68,68,0.15); color: #F87171;">T1</div><div class="name">T1</div></div>
        <div class="vs">VS</div>
        <div class="team"><div class="logo" style="background: rgba(139,92,246,0.15); color: #A78BFA;">GEN</div><div class="name">Gen.G</div></div>
      </div>
      <div class="odds">
        <div class="odd"><div class="ol">T1</div><div class="ov">2.15</div></div>
        <div class="odd"><div class="ol">EMPATE</div><div class="ov">â€”</div></div>
        <div class="odd"><div class="ol">GEN</div><div class="ov">1.75</div></div>
      </div>
    </div>

    <div class="v1-match">
      <div class="mhead">
        <div class="game">ðŸŽ® DOTA 2 Â· TI</div>
        <span class="chip gold">UPCOMING Â· 02:14</span>
      </div>
      <div class="teams">
        <div class="team"><div class="logo" style="background: rgba(0,245,255,0.15); color: #00F5FF;">TS</div><div class="name">Team Spirit</div></div>
        <div class="vs">VS</div>
        <div class="team"><div class="logo" style="background: rgba(245,158,11,0.15); color: #F59E0B;">LGD</div><div class="name">LGD</div></div>
      </div>
      <div class="odds">
        <div class="odd"><div class="ol">SPIRIT</div><div class="ov">1.62</div></div>
        <div class="odd"><div class="ol">EMPATE</div><div class="ov">â€”</div></div>
        <div class="odd"><div class="ol">LGD</div><div class="ov">2.32</div></div>
      </div>
    </div>
  </div>
</section>

<!-- LIVE ACTIVITY -->
<section class="section container" style="padding-top: 36px;">
  <div class="v1-live">
    <div>
      <div class="eyebrow">ACTIVIDAD EN VIVO</div>
      <h2 class="section-title" style="margin-top: 8px;">Esto estÃ¡ <em>pasando ahora</em></h2>
      <p class="lede" style="margin-top: 12px;">12,847 jugadores activos. Feed en tiempo real sin filtros â€” todas las wins y losses desde el Ãºltimo minuto.</p>

      <div class="v1-trust" style="margin-top: 32px;">
        <div class="tcell"><div class="n"><em>\$42.8M</em></div><div class="k">PAGADO Â· 24H</div></div>
        <div class="tcell"><div class="n">1.8M+</div><div class="k">APUESTAS</div></div>
        <div class="tcell"><div class="n">12.8K</div><div class="k">JUGADORES</div></div>
        <div class="tcell"><div class="n">99.1%</div><div class="k">RTP</div></div>
      </div>
    </div>

    <div class="v1-live-feed" id="liveFeed">
      <!-- filled by JS -->
    </div>
  </div>
</section>

<!-- HOW IT WORKS -->
<section class="section container" style="padding-top: 40px;">
  <div class="eyebrow gold">CÃ“MO FUNCIONA</div>
  <h2 class="section-title" style="margin-top: 8px;">Tres pasos al <em>primer payout</em></h2>

  <div class="v1-how">
    <div class="v1-step">
      <div class="num">01</div>
      <h4>Conecta tu wallet</h4>
      <p>USDC, USDT o ETH. Sin KYC para depÃ³sitos bajo \$2,000. Tu cripto, tus llaves.</p>
    </div>
    <div class="v1-step">
      <div class="num">02</div>
      <h4>Elige tu arena</h4>
      <p>Casino provably fair, matches de e-sports, o matchmaking 1v1 con otros jugadores.</p>
    </div>
    <div class="v1-step">
      <div class="num">03</div>
      <h4>Cobra al instante</h4>
      <p>Wins on-chain en menos de 30 segundos. Cada resultado es verificable con su seed hash.</p>
    </div>
  </div>
</section>

<!-- PROVABLY FAIR -->
<section class="section container" style="padding-top: 32px;">
  <div class="v1-fair">
    <div>
      <div class="eyebrow">PROVABLY FAIR</div>
      <h2 class="section-title" style="margin-top: 8px;">Verificado <em>matemÃ¡ticamente</em></h2>
      <p class="lede" style="margin-top: 14px;">Cada ronda genera un seed hash pÃºblico. PodÃ©s verificar cualquier resultado â€” el house no puede manipular nada.</p>
      <a href="#" class="btn ghost" style="margin-top: 22px;">CÃ“MO VERIFICAR â†’</a>
    </div>
    <div class="hash-demo">
      <div><span class="hl">server_seed_hash:</span></div>
      <div class="hv">a7f3b9c2e8d4...1a5f</div>
      <div style="margin-top: 12px;"><span class="hl">client_seed:</span></div>
      <div class="hv">player_42_1738</div>
      <div style="margin-top: 12px;"><span class="hl">nonce:</span> <span class="hv">#147,392</span></div>
      <div style="margin-top: 12px;"><span class="hl">result:</span> <span class="hv">8.24Ã— Â· VERIFIED âœ“</span></div>
    </div>
  </div>
</section>

<!-- TESTIMONIALS -->
<section class="section container" style="padding-top: 28px;">
  <div class="eyebrow purple">LA COMUNIDAD</div>
  <h2 class="section-title" style="margin-top: 8px;">De la <em>arena</em>, para la arena</h2>

  <div class="v1-testis">
    <div class="v1-testi">
      <div class="quote">"Llevo 6 meses. Los payouts son instantÃ¡neos â€” literal, 20 segundos on-chain. No vuelvo a casinos tradicionales."</div>
      <div class="by"><div class="av">M</div><div><div class="n">MatÃ­as_99</div><div class="r">Gold Tier Â· 2,847 apuestas</div></div></div>
    </div>
    <div class="v1-testi">
      <div class="quote">"El matchmaking 1v1 cambiÃ³ cÃ³mo veo las apuestas. AcÃ¡ compite mi skill, no mi suerte."</div>
      <div class="by"><div class="av">L</div><div><div class="n">laura.eth</div><div class="r">Diamond Tier Â· 5,120 apuestas</div></div></div>
    </div>
    <div class="v1-testi">
      <div class="quote">"El provably fair me convenciÃ³. VerifiquÃ© 30 rondas de crash â€” todo cuadra al hash exacto."</div>
      <div class="by"><div class="av">D</div><div><div class="n">degen_xyz</div><div class="r">Platinum Tier Â· 1,432 apuestas</div></div></div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="section container" style="padding-top: 32px;">
  <div class="eyebrow dim">FAQ</div>
  <h2 class="section-title" style="margin-top: 8px;">Preguntas <em>rÃ¡pidas</em></h2>

  <div class="v1-faq">
    <details open><summary>Â¿Necesito KYC para depositar?</summary><div class="a">Solo para retiros mayores a \$2,000 USDC o depÃ³sitos iniciales mayores a \$5,000. Bajo ese threshold, conectÃ¡ tu wallet y listo.</div></details>
    <details><summary>Â¿CÃ³mo sÃ© que los juegos no estÃ¡n manipulados?</summary><div class="a">Cada ronda tiene un server seed hasheado publicado antes de jugar. Tras la ronda revelamos el seed original â€” podÃ©s verificar el hash y recalcular el resultado con tu client seed.</div></details>
    <details><summary>Â¿CuÃ¡nto tardan los retiros?</summary><div class="a">Entre 15 y 40 segundos on-chain. Sin procesos manuales, sin holds de 24h. El smart contract ejecuta el payout apenas cashout.</div></details>
    <details><summary>Â¿Puedo jugar contra otros jugadores, no contra la casa?</summary><div class="a">SÃ­ â€” el modo arena 1v1 matchea jugadores del mismo skill tier. El house toma 2% de fee, el resto se lo lleva el ganador.</div></details>
  </div>
</section>

<!-- FINAL CTA -->
<section class="v1-final">
  <div class="eyebrow">LA ARENA TE ESPERA</div>
  <h2 class="h-title" style="font-size: clamp(2.4rem, 5vw, 4.4rem); margin-top: 14px;">Â¿Listo para <em>entrar</em>?</h2>
  <p class="lede" style="margin: 20px auto 32px; text-align: center;">Saldo de prueba gratis. Sin depÃ³sito hasta que quieras jugar en serio.</p>
  <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
    <a href="#" class="btn primary xl arrow">CREAR CUENTA</a>
    <a href="#" class="btn ghost xl">PROBAR SIN REGISTRO</a>
  </div>
</section>

<footer class="ac-footer">
  <div>Â© 2026 ARENACRYPTO Â· PROVABLY FAIR Â· AGE 18+</div>
  <div style="display: flex; gap: 20px;"><a href="#" style="color: inherit; text-decoration: none;">TERMS</a><a href="#" style="color: inherit; text-decoration: none;">PRIVACY</a><a href="#" style="color: inherit; text-decoration: none;">DOCS</a><a href="#" style="color: inherit; text-decoration: none;">DISCORD</a></div>
</footer>

</div>

`;

const CSS_CONTENT = `
:root {
  --font-display: 'Orbitron', sans-serif;
  --font-body: 'Rajdhani', sans-serif;
}
/* ============================================================
   ArenaCrypto â€” Home + Login shared utilities
   ============================================================ */

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }

body.ac {
  background: #09090b;
  color: #fff;
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
body.ac.ultra-dark { background: #040406; }
body.ac.ultra-dark .surface{ background: rgba(255,255,255,0.025) !important; }

/* ---------- mesh backdrop (drama mode) ---------- */
.mesh-bg {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 70% 50% at 20% 0%,   rgba(0,245,255,0.18),  transparent 60%),
    radial-gradient(ellipse 60% 55% at 85% 15%,  rgba(139,92,246,0.22), transparent 65%),
    radial-gradient(ellipse 50% 50% at 50% 110%, rgba(245,158,11,0.12), transparent 60%),
    radial-gradient(ellipse 80% 60% at 90% 90%,  rgba(0,245,255,0.08),  transparent 55%),
    #09090b;
}
body.ac.ultra-dark .mesh-bg{
  background:
    radial-gradient(ellipse 70% 50% at 20% 0%,   rgba(0,245,255,0.12),  transparent 60%),
    radial-gradient(ellipse 60% 55% at 85% 15%,  rgba(139,92,246,0.15), transparent 65%),
    radial-gradient(ellipse 50% 50% at 50% 110%, rgba(245,158,11,0.08), transparent 60%),
    #040406;
}

.scanlines {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background-image: repeating-linear-gradient(0deg, rgba(0,245,255,0.015) 0 1px, transparent 1px 3px);
  mix-blend-mode: screen;
  opacity: 0.7;
}

.grid-floor {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(0,245,255,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,245,255,0.08) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 85%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 40%, transparent 85%);
}

/* ---------- nav ---------- */
.ac-nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 44px;
  background: linear-gradient(to bottom, rgba(9,9,11,0.9), rgba(9,9,11,0.4));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.ac-nav .brand{
  display: flex; align-items: center; gap: 10px;
  font-family: var(--font-display);
  font-weight: 900; letter-spacing: 0.22em; font-size: 1rem;
}
.ac-nav .brand em{ font-style: normal; color: #00F5FF; text-shadow: 0 0 10px rgba(0,245,255,0.45); }
.ac-nav .brand svg{ width: 26px; height: 26px; }
.ac-nav .links{ display: flex; gap: 26px; }
.ac-nav .links a{
  color: rgba(255,255,255,0.55); text-decoration: none;
  font-family: var(--font-display); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
  transition: color 150ms ease;
}
.ac-nav .links a:hover{ color: #00F5FF; }
.ac-nav .links a.on{ color: #fff; }
.ac-nav .actions{ display: flex; gap: 10px; align-items: center; }

/* ---------- buttons ---------- */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px; border-radius: 6px;
  font-family: var(--font-display); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
  cursor: pointer; border: none; text-decoration: none;
  transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
}
.btn.ghost{ background: transparent; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.1); }
.btn.ghost:hover{ color: #fff; border-color: rgba(0,245,255,0.4); }
.btn.primary{
  background: #00F5FF; color: #09090b;
  box-shadow: 0 0 20px rgba(0,245,255,0.3), 0 0 0 1px rgba(0,245,255,0.5) inset;
}
.btn.primary:hover{ transform: translateY(-1px); box-shadow: 0 6px 24px rgba(0,245,255,0.45); }
.btn.primary:active{ transform: scale(0.97); }
.btn.purple{ background: linear-gradient(135deg, #8B5CF6, #6366F1); color: #fff; box-shadow: 0 0 20px rgba(139,92,246,0.35); }
.btn.purple:hover{ transform: translateY(-1px); box-shadow: 0 6px 24px rgba(139,92,246,0.55); }
.btn.big{ padding: 16px 28px; font-size: 0.8rem; letter-spacing: 0.2em; border-radius: 8px; }
.btn.xl { padding: 20px 40px; font-size: 0.92rem; letter-spacing: 0.22em; border-radius: 10px; }
.btn.arrow::after{ content:'â†’'; font-family: sans-serif; font-weight: 400; }

/* ---------- glass surface ---------- */
.surface{
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

/* ---------- utility type ---------- */
.eyebrow{
  font-family: var(--font-display); font-size: 0.62rem; font-weight: 800; letter-spacing: 0.24em; text-transform: uppercase;
  color: #00F5FF; text-shadow: 0 0 8px rgba(0,245,255,0.35);
}
.eyebrow.purple{ color:#A78BFA; text-shadow: 0 0 8px rgba(139,92,246,0.35); }
.eyebrow.gold{ color:#F59E0B; text-shadow: 0 0 8px rgba(245,158,11,0.35); }
.eyebrow.dim{ color: rgba(255,255,255,0.35); text-shadow: none; }

.h-title{
  font-family: var(--font-display); font-weight: 900;
  font-size: clamp(2.6rem, 6.5vw, 5.6rem);
  letter-spacing: -0.02em; line-height: 0.95;
  text-wrap: balance; margin: 0;
}
.h-title em{ font-style: normal; background: linear-gradient(90deg,#00F5FF,#8B5CF6 60%, #F59E0B); -webkit-background-clip: text; background-clip: text; color: transparent; }
.h-title .stroke{ -webkit-text-stroke: 1.5px rgba(255,255,255,0.25); color: transparent; }

.section-title{
  font-family: var(--font-display); font-weight: 900;
  font-size: clamp(1.6rem, 3.2vw, 2.6rem);
  letter-spacing: -0.01em; line-height: 1.05; margin: 0 0 10px;
  text-wrap: balance;
}
.section-title em{ font-style: normal; color: #00F5FF; text-shadow: 0 0 12px rgba(0,245,255,0.35); }

.lede{
  font-family: var(--font-body); font-size: 1.05rem; line-height: 1.55;
  color: rgba(255,255,255,0.55); max-width: 640px;
  text-wrap: pretty; margin: 0;
}

/* ---------- pills / chips ---------- */
.chip{
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-display); font-size: 0.56rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 100px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.6);
}
.chip.cyan{ background: rgba(0,245,255,0.09); border-color: rgba(0,245,255,0.35); color:#00F5FF; }
.chip.gold{ background: rgba(245,158,11,0.09); border-color: rgba(245,158,11,0.35); color:#F59E0B; }
.chip.green{ background: rgba(46,204,113,0.09); border-color: rgba(46,204,113,0.35); color:#2ECC71; }
.chip.red{ background: rgba(239,68,68,0.09); border-color: rgba(239,68,68,0.35); color:#F87171; }
.chip.purple{ background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.35); color:#A78BFA; }
.chip.live::before{ content:''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 6px currentColor; animation: pulseDot 1.4s ease-in-out infinite; }
@keyframes pulseDot{ 0%,100%{ opacity: 1 } 50%{ opacity: 0.35 } }

/* ---------- sections ---------- */
.section{ position: relative; z-index: 2; padding: 72px 44px; }
.section.tight{ padding: 48px 44px; }
.container{ max-width: 1280px; margin: 0 auto; }

/* ---------- animation intensity ---------- */
body.ac.intensity-low *{ animation-duration: 0ms !important; transition-duration: 50ms !important; }
body.ac.intensity-low .pulseDot,
body.ac.intensity-low .skip-damp{ animation: none !important; }

/* ---------- footer ---------- */
.ac-footer{
  position: relative; z-index: 2;
  padding: 48px 44px 32px;
  border-top: 1px solid rgba(255,255,255,0.05);
  font-family: var(--font-display);
  font-size: 0.58rem; letter-spacing: 0.18em; font-weight: 700; text-transform: uppercase;
  color: rgba(255,255,255,0.35);
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 18px;
}

/* ============================================================
   ArenaCrypto â€” Home v1: "3D Tilted Arena"
   ============================================================ */

.v1-hero{
  position: relative;
  min-height: 760px;
  padding: 56px 44px 24px;
  overflow: hidden;
}

/* ---------- tilted 3D arena floor ---------- */
.v1-stage{
  position: absolute; inset: 0;
  perspective: 1600px; perspective-origin: 50% 40%;
  z-index: 1;
}
.v1-floor{
  position: absolute; left: -30%; right: -30%; bottom: -18%;
  height: 94%;
  background:
    linear-gradient(to top, rgba(9,9,11,0.95) 0%, transparent 50%),
    repeating-linear-gradient(0deg,
      rgba(0,245,255,0.15) 0 1px, transparent 1px 80px),
    repeating-linear-gradient(90deg,
      rgba(139,92,246,0.15) 0 1px, transparent 1px 80px);
  background-color: transparent;
  transform: rotateX(62deg);
  transform-origin: 50% 100%;
  filter: blur(0.3px);
  animation: floorSweep 12s linear infinite;
}
@keyframes floorSweep{
  from{ background-position: 0 0, 0 0, 0 0; }
  to  { background-position: 0 0, 0 80px, 80px 0; }
}
.v1-horizon{
  position: absolute; left: 0; right: 0; top: 32%;
  height: 280px;
  background:
    radial-gradient(ellipse 70% 100% at 50% 100%, rgba(0,245,255,0.22), transparent 70%),
    radial-gradient(ellipse 50% 100% at 30% 100%, rgba(139,92,246,0.18), transparent 65%),
    radial-gradient(ellipse 50% 100% at 75% 100%, rgba(245,158,11,0.16), transparent 65%);
  pointer-events: none;
}
.v1-horizon::after{
  content:''; position: absolute; left: 10%; right: 10%; top: 45%;
  height: 1.5px;
  background: linear-gradient(90deg, transparent, rgba(0,245,255,0.8), rgba(139,92,246,0.8), rgba(245,158,11,0.8), transparent);
  filter: blur(0.5px);
  box-shadow: 0 0 24px rgba(0,245,255,0.6);
}

/* ---------- floating tiles ---------- */
.v1-tiles{
  position: absolute; inset: 0; z-index: 3;
  pointer-events: none;
}
.v1-tile{
  position: absolute;
  padding: 10px 14px;
  background: rgba(9,9,11,0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  display: flex; align-items: center; gap: 10px;
  font-family: var(--font-display);
  box-shadow: 0 10px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset;
  animation: floatTile 6s ease-in-out infinite;
  pointer-events: auto;
  transform-style: preserve-3d;
}
@keyframes floatTile{
  0%,100%{ transform: translateY(0) rotate(var(--rot, 0deg)); }
  50%    { transform: translateY(-8px) rotate(var(--rot, 0deg)); }
}
.v1-tile .mini{
  width: 32px; height: 32px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.9rem;
  flex-shrink: 0;
}
.v1-tile .l1{ font-size: 0.52rem; font-weight: 700; letter-spacing: 0.14em; color: rgba(255,255,255,0.45); text-transform: uppercase; }
.v1-tile .l2{ font-size: 0.78rem; font-weight: 900; color: #fff; letter-spacing: 0.05em; margin-top: 2px; }
.v1-tile.cyan  { border-color: rgba(0,245,255,0.35);  box-shadow: 0 10px 32px rgba(0,245,255,0.15),  0 0 0 1px rgba(0,245,255,0.2) inset; }
.v1-tile.gold  { border-color: rgba(245,158,11,0.35); box-shadow: 0 10px 32px rgba(245,158,11,0.15), 0 0 0 1px rgba(245,158,11,0.2) inset; }
.v1-tile.purple{ border-color: rgba(139,92,246,0.35); box-shadow: 0 10px 32px rgba(139,92,246,0.18), 0 0 0 1px rgba(139,92,246,0.2) inset; }
.v1-tile.red   { border-color: rgba(239,68,68,0.35);  box-shadow: 0 10px 32px rgba(239,68,68,0.18), 0 0 0 1px rgba(239,68,68,0.2) inset; }

.v1-tile .mini.cyan  { background: rgba(0,245,255,0.15);  color: #00F5FF; }
.v1-tile .mini.gold  { background: rgba(245,158,11,0.15); color: #F59E0B; }
.v1-tile .mini.purple{ background: rgba(139,92,246,0.15); color: #A78BFA; }
.v1-tile .mini.red   { background: rgba(239,68,68,0.15);  color: #F87171; }

/* Specific tile placements around the hero */
.v1-tile.t1{ top: 28%;  left:  8%;  --rot: -4deg; animation-delay: 0s; }
.v1-tile.t2{ top: 22%;  right: 10%; --rot: 5deg;  animation-delay: -1.5s; }
.v1-tile.t3{ top: 56%;  left:  4%;  --rot: -6deg; animation-delay: -3s; }
.v1-tile.t4{ top: 62%;  right: 6%;  --rot: 4deg;  animation-delay: -4.5s; }
.v1-tile.t5{ top: 44%;  left:  18%; --rot: -2deg; animation-delay: -2s; }
.v1-tile.t6{ top: 38%;  right: 20%; --rot: 3deg;  animation-delay: -3.5s; }

/* ---------- hero content ---------- */
.v1-copy{
  position: relative; z-index: 10;
  max-width: 860px;
  margin: 40px auto 0;
  text-align: center;
}
.v1-meta{
  display: inline-flex; align-items: center; gap: 10px;
  padding: 6px 14px; border-radius: 100px;
  background: rgba(0,245,255,0.08);
  border: 1px solid rgba(0,245,255,0.25);
  font-family: var(--font-display);
  font-size: 0.58rem; font-weight: 800; letter-spacing: 0.2em;
  color: #00F5FF; text-transform: uppercase;
  margin-bottom: 26px;
}
.v1-meta .dot{ width: 6px; height: 6px; border-radius: 50%; background: #00F5FF; box-shadow: 0 0 8px #00F5FF; animation: pulseDot 1.4s ease-in-out infinite; }
.v1-cta{ margin-top: 34px; display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.v1-stats{
  margin-top: 44px;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
  max-width: 760px; margin-left: auto; margin-right: auto;
}
.v1-stats .stat{ text-align: center; }
.v1-stats .stat .v{
  font-family: var(--font-display); font-weight: 900;
  font-size: 1.9rem; letter-spacing: -0.01em;
  background: linear-gradient(180deg, #fff 30%, rgba(255,255,255,0.5));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.v1-stats .stat .l{
  font-family: var(--font-display); font-size: 0.55rem; font-weight: 700; letter-spacing: 0.2em;
  color: rgba(255,255,255,0.35); text-transform: uppercase;
  margin-top: 4px;
}

/* ---------- winners ticker ---------- */
.v1-ticker{
  position: relative; z-index: 4;
  margin-top: -60px;
  padding: 14px 0;
  background: linear-gradient(90deg, transparent, rgba(0,0,0,0.6) 10%, rgba(0,0,0,0.6) 90%, transparent);
  border-top: 1px solid rgba(255,255,255,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
}
.v1-ticker-row{
  display: flex; gap: 28px;
  animation: tickerScroll 42s linear infinite;
  will-change: transform;
}
@keyframes tickerScroll{
  from{ transform: translateX(0); }
  to  { transform: translateX(-50%); }
}
.v1-ticker .winner{
  display: inline-flex; align-items: center; gap: 10px;
  white-space: nowrap;
  font-family: var(--font-display); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em;
  color: rgba(255,255,255,0.6);
}
.v1-ticker .winner strong{ color: #fff; }
.v1-ticker .winner .ww{ color: #2ECC71; text-shadow: 0 0 6px rgba(46,204,113,0.4); font-weight: 900; }
.v1-ticker .winner .gg{ color: #F59E0B; }
.v1-ticker .winner::before{
  content:''; width: 5px; height: 5px; border-radius: 50%; background: #2ECC71;
  box-shadow: 0 0 6px #2ECC71;
}

/* ---------- games featured ---------- */
.v1-games{
  display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 16px;
  margin-top: 24px;
}
.v1-games .gcard{
  position: relative; overflow: hidden;
  border-radius: 16px; padding: 28px;
  min-height: 260px;
  display: flex; flex-direction: column; justify-content: space-between;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  transition: transform 220ms ease, border-color 220ms ease;
}
.v1-games .gcard:hover{ transform: translateY(-4px); }
.v1-games .gcard.big{ grid-row: span 2; min-height: 540px; }
.v1-games .gcard .name{
  font-family: var(--font-display); font-weight: 900;
  font-size: 1.6rem; letter-spacing: 0.08em; text-transform: uppercase;
  color: #fff; margin-bottom: 6px;
}
.v1-games .gcard.big .name{ font-size: 2.8rem; letter-spacing: -0.01em; text-transform: none; }
.v1-games .gcard .desc{
  font-family: var(--font-body); color: rgba(255,255,255,0.55); font-size: 0.88rem; line-height: 1.5;
  max-width: 340px; text-wrap: pretty;
}
.v1-games .gcard .art{ position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.v1-games .gcard > *:not(.art){ position: relative; z-index: 1; }
.v1-games .gcard .corner{
  position: absolute; top: 22px; right: 22px;
  display: flex; gap: 6px; z-index: 2;
}
.v1-games .gcard.crash{ border-color: rgba(0,245,255,0.25); }
.v1-games .gcard.crash:hover{ border-color: rgba(0,245,255,0.5); }
.v1-games .gcard.crash .art{
  background:
    radial-gradient(ellipse 60% 60% at 80% 80%, rgba(0,245,255,0.2), transparent 60%),
    linear-gradient(135deg, rgba(0,245,255,0.08), transparent 50%);
}
.v1-games .gcard.mines{ border-color: rgba(239,68,68,0.2); }
.v1-games .gcard.mines:hover{ border-color: rgba(239,68,68,0.5); }
.v1-games .gcard.mines .art{ background: radial-gradient(ellipse 60% 60% at 20% 100%, rgba(239,68,68,0.15), transparent 60%); }
.v1-games .gcard.plinko{ border-color: rgba(139,92,246,0.25); }
.v1-games .gcard.plinko:hover{ border-color: rgba(139,92,246,0.5); }
.v1-games .gcard.plinko .art{ background: radial-gradient(ellipse 60% 60% at 80% 20%, rgba(139,92,246,0.18), transparent 60%); }
.v1-games .gcard.tower{ border-color: rgba(245,158,11,0.25); }
.v1-games .gcard.tower:hover{ border-color: rgba(245,158,11,0.5); }
.v1-games .gcard.tower .art{ background: radial-gradient(ellipse 60% 60% at 20% 20%, rgba(245,158,11,0.18), transparent 60%); }

/* crash curve SVG */
.crash-curve{ position: absolute; inset: 0; width: 100%; height: 100%; }
.crash-curve path{ stroke: #00F5FF; stroke-width: 2; fill: none; filter: drop-shadow(0 0 8px rgba(0,245,255,0.6)); }
.crash-curve .grid{ stroke: rgba(0,245,255,0.07); stroke-width: 1; }
.v1-games .gcard.big .mult{
  font-family: var(--font-display); font-size: 4rem; font-weight: 900;
  color: #00F5FF; text-shadow: 0 0 20px rgba(0,245,255,0.5);
  letter-spacing: -0.02em;
  position: absolute; top: 30%; left: 34px; z-index: 1;
}

/* ---------- esports matches ---------- */
.v1-esports{
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;
  margin-top: 18px;
}
.v1-match{
  padding: 18px; border-radius: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  display: flex; flex-direction: column; gap: 12px;
  transition: border-color 200ms ease, transform 200ms ease;
  cursor: pointer;
}
.v1-match:hover{ border-color: rgba(0,245,255,0.4); transform: translateY(-2px); }
.v1-match .mhead{ display: flex; justify-content: space-between; align-items: center; }
.v1-match .game{
  font-family: var(--font-display); font-size: 0.6rem; font-weight: 800; letter-spacing: 0.18em;
  color: rgba(255,255,255,0.45); text-transform: uppercase;
}
.v1-match .teams{ display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
.v1-match .team{ display: flex; flex-direction: column; gap: 4px; align-items: center; text-align: center; }
.v1-match .team .logo{
  width: 40px; height: 40px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-weight: 900; font-size: 0.9rem;
}
.v1-match .team .name{
  font-family: var(--font-display); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.1em;
  color: #fff; text-transform: uppercase;
}
.v1-match .vs{
  font-family: var(--font-display); font-weight: 900; font-size: 0.9rem; color: rgba(255,255,255,0.3); letter-spacing: 0.1em;
}
.v1-match .odds{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
.v1-match .odd{
  padding: 10px 8px; border-radius: 6px;
  background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06);
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  cursor: pointer; transition: background 150ms ease, border-color 150ms ease;
}
.v1-match .odd:hover{ background: rgba(0,245,255,0.08); border-color: rgba(0,245,255,0.4); }
.v1-match .odd .ol{ font-family: var(--font-display); font-size: 0.5rem; font-weight: 700; letter-spacing: 0.16em; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.v1-match .odd .ov{ font-family: var(--font-display); font-size: 0.95rem; font-weight: 900; color: #00F5FF; }

/* ---------- how it works ---------- */
.v1-how{
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
  margin-top: 40px;
}
.v1-step{
  padding: 32px 26px; border-radius: 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.07);
  position: relative;
}
.v1-step .num{
  font-family: var(--font-display); font-weight: 900; font-size: 5rem;
  line-height: 1; letter-spacing: -0.04em;
  background: linear-gradient(180deg, rgba(0,245,255,0.3) 30%, transparent);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  position: absolute; top: 12px; right: 18px;
}
.v1-step h4{
  font-family: var(--font-display); font-size: 1.1rem; font-weight: 900; letter-spacing: 0.05em;
  color: #fff; margin: 0 0 8px; text-transform: uppercase;
}
.v1-step p{
  font-family: var(--font-body); font-size: 0.88rem; line-height: 1.5; color: rgba(255,255,255,0.55);
  margin: 0; text-wrap: pretty;
}

/* ---------- trust / stats row ---------- */
.v1-trust{
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px;
  background: linear-gradient(135deg, rgba(0,245,255,0.25), rgba(139,92,246,0.25) 50%, rgba(245,158,11,0.25));
  padding: 1px;
  border-radius: 16px;
  margin-top: 48px;
}
.v1-trust .tcell{
  background: #0b0b0f;
  padding: 32px 22px;
  display: flex; flex-direction: column; gap: 6px; align-items: center; text-align: center;
}
.v1-trust .tcell:first-child{ border-radius: 16px 0 0 16px; }
.v1-trust .tcell:last-child { border-radius: 0 16px 16px 0; }
.v1-trust .tcell .n{
  font-family: var(--font-display); font-weight: 900; font-size: 2.4rem; letter-spacing: -0.01em;
  color: #fff;
}
.v1-trust .tcell .n em{ font-style: normal; color: #00F5FF; }
.v1-trust .tcell .k{ font-family: var(--font-display); font-size: 0.58rem; font-weight: 700; letter-spacing: 0.2em; color: rgba(255,255,255,0.45); text-transform: uppercase; }

/* ---------- live activity feed ---------- */
.v1-live{
  display: grid; grid-template-columns: 1fr 320px; gap: 24px;
  align-items: start;
}
.v1-live-feed{
  padding: 20px; border-radius: 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.07);
  max-height: 420px; overflow: hidden;
  mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
}
.v1-live-item{
  display: flex; align-items: center; gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font-family: var(--font-display);
}
.v1-live-item:last-child{ border-bottom: none; }
.v1-live-item .avatar{
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 0.72rem;
}
.v1-live-item .what{ flex: 1; font-size: 0.78rem; font-weight: 600; color: #fff; letter-spacing: 0.02em; }
.v1-live-item .what .u{ color: rgba(255,255,255,0.8); }
.v1-live-item .what .g{ color: rgba(255,255,255,0.45); font-size: 0.68rem; }
.v1-live-item .when{ font-size: 0.62rem; color: rgba(255,255,255,0.35); letter-spacing: 0.08em; }

/* ---------- provably fair section ---------- */
.v1-fair{
  display: grid; grid-template-columns: 1fr 1fr; gap: 40px;
  align-items: center;
}
.v1-fair .hash-demo{
  padding: 24px; border-radius: 14px;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(0,245,255,0.2);
  font-family: 'SF Mono', ui-monospace, monospace;
  font-size: 0.75rem;
  line-height: 1.8;
}
.v1-fair .hash-demo .hl{ color: rgba(255,255,255,0.35); }
.v1-fair .hash-demo .hv{ color: #00F5FF; word-break: break-all; }

/* ---------- testimonials ---------- */
.v1-testis{
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
  margin-top: 20px;
}
.v1-testi{
  padding: 26px; border-radius: 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
}
.v1-testi .quote{
  font-family: var(--font-display); font-size: 1rem; font-weight: 600; line-height: 1.5;
  color: rgba(255,255,255,0.9); letter-spacing: 0.01em;
  text-wrap: pretty; margin-bottom: 18px;
}
.v1-testi .by{ display: flex; align-items: center; gap: 10px; }
.v1-testi .by .av{ width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #00F5FF, #8B5CF6); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 900; color: #09090b; }
.v1-testi .by .n{ font-family: var(--font-display); font-size: 0.78rem; font-weight: 800; color: #fff; letter-spacing: 0.08em; }
.v1-testi .by .r{ font-family: var(--font-display); font-size: 0.56rem; font-weight: 700; letter-spacing: 0.16em; color: rgba(255,255,255,0.4); text-transform: uppercase; }

/* ---------- faq ---------- */
.v1-faq{
  display: grid; gap: 10px;
  margin-top: 12px;
  max-width: 780px;
}
.v1-faq details{
  padding: 18px 22px; border-radius: 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  cursor: pointer;
}
.v1-faq details[open]{ border-color: rgba(0,245,255,0.3); }
.v1-faq summary{
  list-style: none;
  display: flex; align-items: center; justify-content: space-between;
  font-family: var(--font-display); font-size: 0.95rem; font-weight: 700;
  color: #fff; letter-spacing: 0.02em;
}
.v1-faq summary::-webkit-details-marker{ display: none; }
.v1-faq summary::after{ content:'+'; font-family: var(--font-display); font-weight: 900; color: #00F5FF; font-size: 1.5rem; transition: transform 200ms ease; }
.v1-faq details[open] summary::after{ content:'âˆ’'; }
.v1-faq .a{
  font-family: var(--font-body); font-size: 0.92rem; line-height: 1.55;
  color: rgba(255,255,255,0.6); margin-top: 12px;
  text-wrap: pretty;
}

/* ---------- final CTA ---------- */
.v1-final{
  text-align: center;
  padding: 80px 44px;
  position: relative;
  overflow: hidden;
}
.v1-final::before{
  content:''; position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 50% 80% at 50% 50%, rgba(0,245,255,0.15), transparent 60%);
  z-index: 0;
}
.v1-final > *{ position: relative; z-index: 1; }

`;

export default function DesignTestV1() {
  React.useEffect(() => {
    // Add logic for ticker if needed later
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_CONTENT }} />
      <div 
        className="ac" 
        style={{ minHeight: '100vh', width: '100vw', margin: 0, padding: 0, background: '#09090b', color: '#fff', overflowX: 'hidden' }}
        dangerouslySetInnerHTML={{ __html: HTML_CONTENT }} 
      />
    </>
  );
}
