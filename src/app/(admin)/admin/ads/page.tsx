'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Image as ImageIcon, Plus, Trash2, ToggleLeft, ToggleRight, ExternalLink, Upload } from 'lucide-react'

interface Ad {
  id: string
  title: string
  description: string | null
  image_url: string
  link_url: string
  position: string
  is_active: boolean
  starts_at: string
  ends_at: string | null
  created_at: string
}

const POSITIONS: { value: string; label: string }[] = [
  { value: 'banner_top',           label: 'Banner Superior (páginas principales)' },
  { value: 'between_tournaments',  label: 'Entre torneos (lobby de torneos)' },
  { value: 'sidebar',              label: 'Barra lateral' },
  { value: 'tournament_page',      label: 'Página de torneo' },
]

const POSITION_BADGE: Record<string, string> = {
  banner_top:          '#00F5FF',
  between_tournaments: '#10b981',
  sidebar:             '#8b5cf6',
  tournament_page:     '#f59e0b',
}

const emptyForm = {
  title: '', description: '', link_url: '',
  position: 'between_tournaments', starts_at: '', ends_at: '',
}

export default function AdsAdminPage() {
  const [ads, setAds]           = useState<Ad[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(emptyForm)
  const [imageFile, setFile]    = useState<File | null>(null)
  const [imagePreview, setPreview] = useState<string>('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const fileRef                 = useRef<HTMLInputElement>(null)

  const fetchAds = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false })
    setAds(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAds() }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.title || !form.link_url || !imageFile) {
      setError('Título, link e imagen son obligatorios.')
      return
    }
    setSaving(true)

    // 1. Upload image to Storage
    const ext      = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('ads')
      .upload(fileName, imageFile, { upsert: false })

    if (uploadErr) { setError(`Error subiendo imagen: ${uploadErr.message}`); setSaving(false); return }

    const { data: { publicUrl } } = supabase.storage.from('ads').getPublicUrl(fileName)

    // 2. Insert ad record
    const { error: insertErr } = await supabase.from('ads').insert({
      title:       form.title,
      description: form.description || null,
      image_url:   publicUrl,
      link_url:    form.link_url,
      position:    form.position,
      starts_at:   form.starts_at || new Date().toISOString(),
      ends_at:     form.ends_at   || null,
    })

    if (insertErr) { setError(`Error guardando anuncio: ${insertErr.message}`); setSaving(false); return }

    setForm(emptyForm); setFile(null); setPreview(''); setShowForm(false)
    fetchAds()
    setSaving(false)
  }

  const toggleActive = async (ad: Ad) => {
    await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id)
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, is_active: !a.is_active } : a))
  }

  const deleteAd = async (ad: Ad) => {
    if (!confirm(`¿Eliminar "${ad.title}"?`)) return
    // Remove image from storage
    const fileName = ad.image_url.split('/').pop()
    if (fileName) await supabase.storage.from('ads').remove([fileName])
    await supabase.from('ads').delete().eq('id', ad.id)
    setAds(prev => prev.filter(a => a.id !== ad.id))
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-orbitron" style={{ fontSize: '1.6rem' }}>
            GESTIÓN DE <span className="neon-text-cyan">ANUNCIOS</span>
          </h1>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', color: 'hsl(var(--text-muted))', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Banners publicitarios mostrados a usuarios no-Premium.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError('') }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', letterSpacing: '0.12em' }}
        >
          <Plus size={14} />
          {showForm ? 'CANCELAR' : 'NUEVO ANUNCIO'}
        </button>
      </div>

      {/* ── Create form ── */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 className="font-orbitron" style={{ fontSize: '0.75rem', letterSpacing: '0.15em', color: '#00F5FF' }}>
            NUEVO ANUNCIO
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={labelStyle}>Título *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Razer Pro Gaming" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={labelStyle}>Link de destino *</label>
              <input value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={labelStyle}>Descripción (opcional)</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Texto corto que aparece bajo el título" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={labelStyle}>Posición *</label>
              <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} style={inputStyle}>
                {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={labelStyle}>Inicio (vacío = ahora)</label>
              <input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={labelStyle}>Fin (vacío = sin límite)</label>
              <input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          {/* Image upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={labelStyle}>Imagen del banner *</label>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${imagePreview ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '10px', cursor: 'pointer',
                overflow: 'hidden', minHeight: '120px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)', position: 'relative',
                transition: 'border-color 200ms',
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '2rem' }}>
                  <Upload size={24} color="hsl(var(--text-muted))" />
                  <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'hsl(var(--text-muted))' }}>
                    CLICK PARA SUBIR IMAGEN
                  </span>
                  <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                    PNG, JPG, WebP · recomendado 1200×400 px
                  </span>
                </div>
              )}
              {imagePreview && (
                <div style={{
                  position: 'absolute', bottom: '0.5rem', right: '0.5rem',
                  background: 'rgba(0,0,0,0.7)', borderRadius: '6px',
                  padding: '0.3rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}>
                  <Upload size={12} color="#00F5FF" />
                  <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.55rem', color: '#00F5FF', letterSpacing: '0.08em' }}>CAMBIAR</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>

          {error && <p style={{ fontSize: '0.75rem', color: '#f87171', fontFamily: 'Rajdhani, sans-serif' }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary"
            style={{ alignSelf: 'flex-start', fontSize: '0.7rem', letterSpacing: '0.12em', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'GUARDANDO...' : 'PUBLICAR ANUNCIO'}
          </button>
        </div>
      )}

      {/* ── Ads list ── */}
      {loading ? (
        <p style={{ fontFamily: 'Rajdhani, sans-serif', color: 'hsl(var(--text-muted))' }}>Cargando anuncios...</p>
      ) : ads.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <ImageIcon size={32} color="hsl(var(--text-muted))" style={{ margin: '0 auto 1rem' }} />
          <p className="font-orbitron" style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'hsl(var(--text-muted))' }}>
            SIN ANUNCIOS CONFIGURADOS
          </p>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '0.5rem' }}>
            Crea el primer banner con el botón "NUEVO ANUNCIO".
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {ads.map(ad => {
            const posLabel   = POSITIONS.find(p => p.value === ad.position)?.label ?? ad.position
            const badgeColor = POSITION_BADGE[ad.position] ?? '#00F5FF'
            const expired    = ad.ends_at ? new Date(ad.ends_at) < new Date() : false

            return (
              <div key={ad.id} className="glass-panel" style={{
                padding: '0',
                overflow: 'hidden',
                opacity: (!ad.is_active || expired) ? 0.6 : 1,
                transition: 'opacity 200ms',
              }}>
                <div style={{ display: 'flex', gap: 0 }}>
                  {/* Thumbnail */}
                  <div style={{ width: '200px', flexShrink: 0, position: 'relative' }}>
                    <img
                      src={ad.image_url}
                      alt={ad.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: '100px' }}
                    />
                    {(!ad.is_active || expired) && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.1em', color: '#f87171' }}>
                          {expired ? 'EXPIRADO' : 'INACTIVO'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        <span style={{
                          fontSize: '0.55rem', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.1em',
                          color: badgeColor, background: `rgba(${badgeColor === '#00F5FF' ? '0,245,255' : badgeColor === '#10b981' ? '16,185,129' : badgeColor === '#8b5cf6' ? '139,92,246' : '245,158,11'},0.15)`,
                          padding: '0.2rem 0.6rem', borderRadius: '4px', border: `1px solid ${badgeColor}44`,
                        }}>
                          {posLabel}
                        </span>
                        {expired && (
                          <span style={{ fontSize: '0.55rem', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.08em', color: '#f87171' }}>
                            EXPIRADO
                          </span>
                        )}
                      </div>
                      <h4 className="font-orbitron" style={{ fontSize: '0.8rem', letterSpacing: '0.08em', color: 'hsl(var(--text-primary))' }}>
                        {ad.title}
                      </h4>
                      {ad.description && (
                        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                          {ad.description}
                        </p>
                      )}
                      <a
                        href={ad.link_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', fontFamily: 'Rajdhani, sans-serif', color: 'hsl(var(--text-muted))', marginTop: '0.25rem', textDecoration: 'none' }}
                      >
                        <ExternalLink size={10} />
                        {ad.link_url.length > 50 ? ad.link_url.slice(0, 50) + '…' : ad.link_url}
                      </a>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.65rem', fontFamily: 'Rajdhani, sans-serif', color: 'hsl(var(--text-muted))' }}>
                        {ad.ends_at
                          ? `Hasta: ${new Date(ad.ends_at).toLocaleDateString('es-ES')}`
                          : 'Sin fecha de expiración'}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => toggleActive(ad)}
                          title={ad.is_active ? 'Desactivar' : 'Activar'}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                            fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.08em',
                            color: ad.is_active ? '#10b981' : 'hsl(var(--text-muted))',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            background: ad.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${ad.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                            transition: 'all 150ms',
                          } as any}
                        >
                          {ad.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {ad.is_active ? 'ACTIVO' : 'INACTIVO'}
                        </button>
                        <button
                          onClick={() => deleteAd(ad)}
                          title="Eliminar"
                          style={{
                            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                            borderRadius: '6px', cursor: 'pointer', padding: '0.4rem 0.6rem',
                            color: '#f87171', display: 'flex', alignItems: 'center',
                            transition: 'background 150ms',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'Orbitron, sans-serif', fontSize: '0.55rem',
  letterSpacing: '0.12em', color: 'hsl(var(--text-muted))',
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.4)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
  padding: '0.6rem 0.85rem', fontSize: '0.85rem',
  color: 'hsl(var(--text-primary))', outline: 'none',
  fontFamily: 'Rajdhani, sans-serif', boxSizing: 'border-box',
  letterSpacing: '0.02em',
}
