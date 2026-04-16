'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/contexts/UserContext'

interface Ad {
  id: string
  title: string
  description: string | null
  image_url: string
  link_url: string
  position: string
}

type Position = 'banner_top' | 'between_tournaments' | 'sidebar' | 'tournament_page'

interface AdZoneProps {
  position: Position
  // Fallback para compatibilidad con el prop "slot" antiguo
  slot?: 'sidebar' | 'footer'
}

export default function AdZone({ position, slot }: AdZoneProps) {
  const { isPremium, loading: userLoading } = useUser()
  const [ads, setAds]       = useState<Ad[]>([])
  const [current, setCurrent] = useState(0)
  const [loaded, setLoaded]  = useState(false)

  // Mapa de compatibilidad: slot antiguo → nueva posición
  const resolvedPosition: Position = position ?? (slot === 'footer' ? 'between_tournaments' : 'sidebar')

  useEffect(() => {
    if (userLoading || isPremium) return
    supabase
      .from('ads')
      .select('id, title, description, image_url, link_url, position')
      .eq('position', resolvedPosition)
      .eq('is_active', true)
      .lte('starts_at', new Date().toISOString())
      .then(({ data }) => {
        // Filter expired client-side (ends_at could be null)
        const active = (data ?? []).filter((a: any) =>
          !a.ends_at || new Date(a.ends_at) >= new Date()
        )
        setAds(active)
        setLoaded(true)
      })
  }, [resolvedPosition, isPremium, userLoading])

  // Rotation: si hay más de 1 anuncio, rotar cada 8 segundos
  useEffect(() => {
    if (ads.length <= 1) return
    const t = setInterval(() => setCurrent(c => (c + 1) % ads.length), 8000)
    return () => clearInterval(t)
  }, [ads.length])

  // No mostrar a usuarios premium ni mientras carga
  if (userLoading || isPremium || !loaded || ads.length === 0) return null

  const ad = ads[current]

  // ── BANNER TOP (full-width strip) ──────────────────────────────────────────
  if (resolvedPosition === 'banner_top') {
    return (
      <a href={ad.link_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'relative', width: '100%', height: '80px', overflow: 'hidden',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
          }}
        >
          <img src={ad.image_url} alt={ad.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.55) saturate(1.2)' }} />
          <div style={{
            position: 'absolute', inset: 0, padding: '0 1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 60%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{
                fontFamily: 'Orbitron, sans-serif', fontSize: '0.5rem', letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)',
                padding: '0.15rem 0.4rem', borderRadius: '3px',
              }}>
                PUBLICIDAD
              </span>
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.1em', color: '#fff' }}>
                {ad.title}
              </span>
              {ad.description && (
                <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                  — {ad.description}
                </span>
              )}
            </div>
            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.12em', color: '#00F5FF' }}>
              VER MÁS →
            </span>
          </div>
        </motion.div>
      </a>
    )
  }

  // ── BETWEEN TOURNAMENTS (card inline en grid) ─────────────────────────────
  if (resolvedPosition === 'between_tournaments') {
    return (
      <a href={ad.link_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="glass-panel"
          style={{
            position: 'relative', overflow: 'hidden',
            minHeight: '180px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}
        >
          <img
            src={ad.image_url} alt={ad.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.4) saturate(1.3)' }}
          />
          <div style={{
            position: 'relative', zIndex: 1, padding: '1rem',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
          }}>
            <span style={{
              fontFamily: 'Orbitron, sans-serif', fontSize: '0.48rem', letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.07)',
              padding: '0.15rem 0.4rem', borderRadius: '3px',
            }}>
              PUBLICIDAD
            </span>
            <h4 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem', letterSpacing: '0.1em', color: '#fff', marginTop: '0.35rem' }}>
              {ad.title}
            </h4>
            {ad.description && (
              <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                {ad.description}
              </p>
            )}
          </div>
          {ads.length > 1 && (
            <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', display: 'flex', gap: '4px', zIndex: 2 }}>
              {ads.map((_, i) => (
                <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: i === current ? '#00F5FF' : 'rgba(255,255,255,0.25)', transition: 'background 300ms' }} />
              ))}
            </div>
          )}
        </motion.div>
      </a>
    )
  }

  // ── SIDEBAR & TOURNAMENT_PAGE (vertical card) ─────────────────────────────
  return (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-panel"
        style={{
          position: 'relative', overflow: 'hidden',
          minHeight: '220px', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${ad.image_url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'brightness(0.4) saturate(1.2)',
          transition: 'transform 0.8s ease',
        }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '1.5rem' }}>
          <span style={{
            fontFamily: 'Orbitron, sans-serif', fontSize: '0.5rem', letterSpacing: '0.1em',
            background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '2px',
            color: 'rgba(255,255,255,0.5)',
          }}>
            PUBLICIDAD
          </span>
          <h4 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', letterSpacing: '0.15em', color: '#fff', marginTop: '0.5rem' }}>
            {ad.title}
          </h4>
          {ad.description && (
            <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.35rem', lineHeight: 1.4 }}>
              {ad.description}
            </p>
          )}
          <div style={{
            marginTop: '0.75rem', display: 'inline-block',
            background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)',
            color: '#00F5FF', padding: '0.4rem 1rem',
            fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.12em',
            borderRadius: '4px',
          }}>
            VER MÁS
          </div>
        </div>
      </motion.div>
    </a>
  )
}
