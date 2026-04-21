"use client";
import Link from 'next/link'

const GAMES = [
  {
    href: "/arena/games/crash",
    icon: "↑×",
    name: "CRASH",
    color: "#00F5FF",
    borderColor: "rgba(0,245,255,0.12)",
    desc: "El multiplicador sube sin parar. Cobra antes de que explote o lo pierdes todo.",
    tags: ["Hasta ×100+", "RTP 97%", "Multijugador"],
    badge: null,
  },
  {
    href: "/arena/games/dice",
    icon: "◈",
    name: "DICE",
    color: "hsl(270,80%,70%)",
    borderColor: "rgba(167,139,250,0.12)",
    desc: "Elige un número y apuesta si el dado cae over o under. Ajusta el riesgo tú mismo.",
    tags: ["Hasta ×99x", "RTP 97%", "Instantáneo"],
    badge: null,
  },
  {
    href: "/arena/games/mines",
    icon: "💣",
    name: "MINES",
    color: "#00F5FF",
    borderColor: "rgba(0,245,255,0.12)",
    desc: "Descubre gemas en un campo minado. Cobra cuando quieras o pierde todo con una mina.",
    tags: ["Hasta ×24x", "RTP 97%", "Estrategia"],
    badge: "NUEVO",
  },
  {
    href: "/arena/games/plinko",
    icon: "⬡",
    name: "PLINKO",
    color: "#F59E0B",
    borderColor: "rgba(245,158,11,0.15)",
    desc: "Suelta la bola por la pirámide de clavos. Aterriza en slots con distintos multiplicadores.",
    tags: ["3 niveles de riesgo", "RTP 97%", "Visual"],
    badge: "NUEVO",
  },
  {
    href: "/arena/games/dragon-tower",
    icon: "🐉",
    name: "DRAGON TOWER",
    color: "#A78BFA",
    borderColor: "rgba(167,139,250,0.15)",
    desc: "Sube la torre eligiendo puertas. Cada nivel multiplica tu apuesta. Un error y caes.",
    tags: ["4 dificultades", "RTP 97%", "Adrenalina"],
    badge: "NUEVO",
  },
]

export default function GamesHubPage() {
  return (
    <div style={{ padding: '2rem 2rem 4rem', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 1000 }}>
      <div>
        <h1 className="font-orbitron" style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', lineHeight: 1, marginBottom: '0.4rem' }}>
          Arena <span className="neon-text-purple">Games</span>
        </h1>
        <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
          Mini-juegos crypto · Provably Fair · Saldo real y de prueba
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: '1rem' }}>
        {GAMES.map((g) => (
          <Link key={g.href} href={g.href} style={{ textDecoration: 'none', position: 'relative' }}>
            {g.badge && (
              <span style={{
                position: 'absolute', top: 12, right: 12,
                background: g.color, color: '#000',
                fontFamily: 'Rajdhani,sans-serif', fontSize: '0.6rem', fontWeight: 800,
                letterSpacing: '0.12em', padding: '0.15rem 0.5rem', borderRadius: 4,
                zIndex: 2,
              }}>{g.badge}</span>
            )}
            <div style={{
              background: 'var(--color-bg-card)',
              border: `1px solid ${g.borderColor}`,
              borderRadius: 16,
              padding: '1.75rem',
              display: 'flex', flexDirection: 'column', gap: '1rem',
              cursor: 'pointer',
              transition: 'border-color 150ms ease-out, transform 150ms ease-out',
              height: '100%',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = g.color + '66';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = g.borderColor;
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}>
              <div className="font-orbitron" style={{ fontSize: '2rem', lineHeight: 1, color: g.color }}>{g.icon}</div>
              <div>
                <p className="font-orbitron" style={{ fontSize: '1.1rem', color: g.color, marginBottom: '0.35rem' }}>{g.name}</p>
                <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{g.desc}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {g.tags.map(tag => (
                  <span key={tag} style={{
                    fontFamily: 'Rajdhani,sans-serif', fontSize: '0.65rem', fontWeight: 700,
                    letterSpacing: '0.08em', padding: '0.2rem 0.55rem',
                    border: `1px solid ${g.color}33`, borderRadius: 6,
                    color: g.color + '99',
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
