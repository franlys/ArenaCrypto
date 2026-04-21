import Link from 'next/link'

export default function GamesHubPage() {
  return (
    <div style={{ padding: '2rem 2rem 4rem', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 900 }}>
      <div>
        <h1 className="font-orbitron" style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', lineHeight: 1, marginBottom: '0.4rem' }}>
          Arena <span className="neon-text-purple">Games</span>
        </h1>
        <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
          Mini-juegos crypto · Provably Fair · Saldo real y de prueba
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '1rem' }}>
        {/* Crash */}
        <Link href="/arena/games/crash" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid rgba(0,245,255,0.12)',
            borderRadius: 16,
            padding: '1.75rem',
            display: 'flex', flexDirection: 'column', gap: '1rem',
            cursor: 'pointer',
            transition: 'border-color 150ms ease-out',
          }}>
            <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>📈</div>
            <div>
              <p className="font-orbitron" style={{ fontSize: '1.1rem', color: '#00F5FF', marginBottom: '0.35rem' }}>CRASH</p>
              <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                El multiplicador sube sin parar. Cobra antes de que explote o lo pierdes todo.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['Hasta ×100+', 'RTP 97%', 'Multijugador'].map(tag => (
                <span key={tag} style={{
                  fontFamily: 'Rajdhani,sans-serif', fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.08em', padding: '0.2rem 0.55rem',
                  border: '1px solid rgba(0,245,255,0.2)', borderRadius: 6,
                  color: 'rgba(0,245,255,0.6)',
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </Link>

        {/* Dice */}
        <Link href="/arena/games/dice" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid rgba(167,139,250,0.12)',
            borderRadius: 16,
            padding: '1.75rem',
            display: 'flex', flexDirection: 'column', gap: '1rem',
            cursor: 'pointer',
            transition: 'border-color 150ms ease-out',
          }}>
            <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🎲</div>
            <div>
              <p className="font-orbitron" style={{ fontSize: '1.1rem', color: 'hsl(var(--neon-purple))', marginBottom: '0.35rem' }}>DICE</p>
              <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                Elige un número y apuesta si el dado cae over o under. Ajusta el riesgo tú mismo.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['Hasta ×99x', 'RTP 97%', 'Instantáneo'].map(tag => (
                <span key={tag} style={{
                  fontFamily: 'Rajdhani,sans-serif', fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.08em', padding: '0.2rem 0.55rem',
                  border: '1px solid rgba(167,139,250,0.2)', borderRadius: 6,
                  color: 'rgba(167,139,250,0.6)',
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
