'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Copy, ExternalLink, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

type Status = 'pending' | 'processing' | 'completed' | 'failed'

interface Withdrawal {
  id: string
  user_id: string
  amount: number
  to_address: string
  status: Status
  tx_hash: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  profiles?: { username: string; balance?: number }
}

const TABS: { key: Status | 'all'; label: string }[] = [
  { key: 'pending',   label: 'PENDIENTES'  },
  { key: 'processing', label: 'EN PROCESO' },
  { key: 'completed', label: 'COMPLETADOS' },
  { key: 'failed',    label: 'RECHAZADOS'  },
]

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  pending:    { label: 'PENDIENTE',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  processing: { label: 'EN PROCESO',  color: '#00F5FF', bg: 'rgba(0,245,255,0.1)'   },
  completed:  { label: 'COMPLETADO',  color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  failed:     { label: 'RECHAZADO',   color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
}

const POLYGON_EXPLORER = 'https://polygonscan.com/tx/'

export default function WithdrawalsPage() {
  const [rows, setRows]       = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<Status | 'all'>('pending')

  // Per-row state for TX hash input and reject notes
  const [txInputs, setTxInputs]     = useState<Record<string, string>>({})
  const [rejectNotes, setNotes]     = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({})

  const fetchRows = async () => {
    const { data } = await supabase
      .from('withdrawal_requests')
      .select('id, user_id, amount, to_address, status, tx_hash, paid_at, notes, created_at, profiles(username)')
      .order('created_at', { ascending: false })
    setRows((data as unknown as Withdrawal[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchRows() }, [])

  const copyText = (text: string) => navigator.clipboard.writeText(text)

  const markProcessing = async (id: string) => {
    await supabase.from('withdrawal_requests').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: 'processing' } : r))
  }

  const completePay = async (row: Withdrawal) => {
    const txHash = txInputs[row.id]?.trim()
    if (!txHash) { alert('Pega el TX hash de Polygon antes de confirmar.'); return }

    setProcessing(p => ({ ...p, [row.id]: true }))
    const { error } = await supabase.rpc('admin_complete_withdrawal', {
      p_withdrawal_id: row.id,
      p_tx_hash:       txHash,
    })
    if (error) { alert('Error: ' + error.message); setProcessing(p => ({ ...p, [row.id]: false })); return }

    setRows(prev => prev.map(r => r.id === row.id
      ? { ...r, status: 'completed', tx_hash: txHash, paid_at: new Date().toISOString() }
      : r
    ))
    setTxInputs(p => ({ ...p, [row.id]: '' }))
    setProcessing(p => ({ ...p, [row.id]: false }))
  }

  const rejectWithdrawal = async (row: Withdrawal) => {
    const note = rejectNotes[row.id] ?? ''
    if (!confirm(`¿Rechazar el retiro de $${row.amount} USDC de ${row.profiles?.username ?? '?'}?\nEl saldo será devuelto al usuario.`)) return

    setProcessing(p => ({ ...p, [row.id]: true }))
    const { error } = await supabase.rpc('admin_reject_withdrawal', {
      p_withdrawal_id: row.id,
      p_notes:         note || null,
    })
    if (error) { alert('Error: ' + error.message); setProcessing(p => ({ ...p, [row.id]: false })); return }

    setRows(prev => prev.map(r => r.id === row.id
      ? { ...r, status: 'failed', notes: note }
      : r
    ))
    setProcessing(p => ({ ...p, [row.id]: false }))
  }

  const visible      = tab === 'all' ? rows : rows.filter(r => r.status === tab)
  const pendingTotal = rows.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0)
  const pendingCount = rows.filter(r => r.status === 'pending').length

  if (loading) return (
    <div style={{ padding: '3rem', fontFamily: 'Orbitron, sans-serif', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'hsl(var(--text-muted))' }}>
      CARGANDO RETIROS...
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-orbitron" style={{ fontSize: '1.6rem' }}>
            WITHDRAWAL <span className="neon-text-cyan">MANAGER</span>
          </h1>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', color: 'hsl(var(--text-muted))', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Gestiona y registra los pagos manuales en Polygon.
          </p>
        </div>

        {pendingCount > 0 && (
          <div style={{
            padding: '0.75rem 1.25rem', borderRadius: '10px',
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem',
          }}>
            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.55rem', letterSpacing: '0.12em', color: '#f59e0b' }}>
              POR PAGAR
            </span>
            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1.2rem', color: '#f59e0b', letterSpacing: '0.05em' }}>
              ${pendingTotal.toFixed(2)} <span style={{ fontSize: '0.7rem' }}>USDC</span>
            </span>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
              {pendingCount} solicitud{pendingCount !== 1 ? 'es' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const count = t.key === 'all' ? rows.length : rows.filter(r => r.status === t.key).length
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="font-orbitron"
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
                fontSize: '0.6rem', letterSpacing: '0.1em', border: 'none',
                background: isActive ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.05)',
                color: isActive ? '#00F5FF' : 'hsl(var(--text-muted))',
                transition: 'all 150ms',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}
            >
              {t.label}
              {count > 0 && (
                <span style={{
                  background: isActive ? 'rgba(0,245,255,0.25)' : 'rgba(255,255,255,0.1)',
                  color: isActive ? '#00F5FF' : 'hsl(var(--text-muted))',
                  borderRadius: '10px', padding: '0.1rem 0.4rem',
                  fontSize: '0.55rem',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <CheckCircle size={28} color="hsl(var(--text-muted))" style={{ margin: '0 auto 1rem' }} />
          <p className="font-orbitron" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'hsl(var(--text-muted))' }}>
            SIN RETIROS EN ESTE ESTADO
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {visible.map((row, i) => {
            const meta     = STATUS_META[row.status]
            const isOpen   = expanded[row.id]
            const isBusy   = processing[row.id]

            return (
              <motion.div
                key={row.id}
                className="glass-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                style={{ padding: 0, overflow: 'hidden' }}
              >
                {/* Main row */}
                <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>

                  {/* Status dot */}
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                    background: meta.color,
                    boxShadow: `0 0 6px ${meta.color}`,
                  }} />

                  {/* User + amount */}
                  <div style={{ flex: 1, minWidth: '140px' }}>
                    <p className="font-orbitron" style={{ fontSize: '0.72rem', letterSpacing: '0.08em', color: 'hsl(var(--text-primary))' }}>
                      {row.profiles?.username ?? row.user_id.slice(0, 8) + '…'}
                    </p>
                    <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.1rem' }}>
                      {new Date(row.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Amount */}
                  <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', color: '#00F5FF', letterSpacing: '0.05em', flexShrink: 0 }}>
                    ${row.amount.toFixed(2)}
                    <span style={{ fontSize: '0.55rem', marginLeft: '0.3rem', color: 'hsl(var(--text-muted))' }}>USDC</span>
                  </span>

                  {/* Address */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                      {row.to_address.slice(0, 6)}…{row.to_address.slice(-4)}
                    </span>
                    <button
                      onClick={() => copyText(row.to_address)}
                      title="Copiar dirección completa"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'hsl(var(--text-muted))' }}
                    >
                      <Copy size={12} />
                    </button>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    fontSize: '0.55rem', fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.1em',
                    color: meta.color, background: meta.bg,
                    padding: '0.25rem 0.6rem', borderRadius: '4px', flexShrink: 0,
                  }}>
                    {meta.label}
                  </span>

                  {/* TX hash link (completed) */}
                  {row.tx_hash && (
                    <a
                      href={POLYGON_EXPLORER + row.tx_hash}
                      target="_blank" rel="noopener noreferrer"
                      title="Ver en Polygonscan"
                      style={{ color: '#10b981', flexShrink: 0 }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}

                  {/* Action toggle */}
                  {(row.status === 'pending' || row.status === 'processing') && (
                    <button
                      onClick={() => setExpanded(p => ({ ...p, [row.id]: !p[row.id] }))}
                      style={{
                        flexShrink: 0, padding: '0.4rem 0.85rem', borderRadius: '6px', cursor: 'pointer',
                        fontFamily: 'Orbitron, sans-serif', fontSize: '0.58rem', letterSpacing: '0.1em',
                        background: isOpen ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.07)',
                        border: `1px solid ${isOpen ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        color: isOpen ? '#00F5FF' : 'hsl(var(--text-muted))',
                        transition: 'all 150ms',
                      }}
                    >
                      {isOpen ? 'CERRAR ▲' : 'GESTIONAR ▼'}
                    </button>
                  )}
                </div>

                {/* Expanded action panel */}
                {isOpen && (row.status === 'pending' || row.status === 'processing') && (
                  <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(0,0,0,0.25)',
                    padding: '1.25rem',
                    display: 'flex', flexDirection: 'column', gap: '1rem',
                  }}>

                    {/* Full address */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '0.55rem', letterSpacing: '0.1em', color: 'hsl(var(--text-muted))' }}>
                        DIRECCIÓN DESTINO
                      </span>
                      <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '0.5rem 0.75rem',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#00F5FF', flex: 1, wordBreak: 'break-all' }}>
                          {row.to_address}
                        </span>
                        <button
                          onClick={() => copyText(row.to_address)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00F5FF', flexShrink: 0 }}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Workflow steps */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>

                      {/* Step indicator */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '180px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {row.status === 'pending'
                            ? <Clock size={12} color="#f59e0b" />
                            : <CheckCircle size={12} color="#10b981" />
                          }
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem', color: row.status === 'pending' ? '#f59e0b' : '#10b981' }}>
                            1. Enviar USDC desde tu wallet
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {row.status === 'processing'
                            ? <Clock size={12} color="#00F5FF" />
                            : <AlertCircle size={12} color="hsl(var(--text-muted))" />
                          }
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                            2. Copiar TX hash de Polygonscan
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertCircle size={12} color="hsl(var(--text-muted))" />
                          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                            3. Pegar hash y confirmar abajo
                          </span>
                        </div>
                      </div>

                      {/* TX hash input + confirm */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '260px' }}>
                        <input
                          value={txInputs[row.id] ?? ''}
                          onChange={e => setTxInputs(p => ({ ...p, [row.id]: e.target.value }))}
                          placeholder="0x... (TX hash de Polygon)"
                          style={{
                            width: '100%', background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(0,245,255,0.2)', borderRadius: '8px',
                            padding: '0.6rem 0.85rem', fontSize: '0.75rem',
                            color: '#00F5FF', outline: 'none',
                            fontFamily: 'monospace', boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {row.status === 'pending' && (
                            <button
                              onClick={() => markProcessing(row.id)}
                              style={{
                                padding: '0.5rem 0.85rem', borderRadius: '6px', cursor: 'pointer',
                                fontFamily: 'Orbitron, sans-serif', fontSize: '0.58rem', letterSpacing: '0.08em',
                                background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)',
                                color: '#00F5FF',
                              }}
                            >
                              MARCAR EN PROCESO
                            </button>
                          )}
                          <button
                            onClick={() => completePay(row)}
                            disabled={isBusy || !txInputs[row.id]?.trim()}
                            style={{
                              flex: 1, padding: '0.5rem', borderRadius: '6px', cursor: isBusy ? 'default' : 'pointer',
                              fontFamily: 'Orbitron, sans-serif', fontSize: '0.6rem', letterSpacing: '0.1em',
                              background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
                              color: '#10b981',
                              opacity: (isBusy || !txInputs[row.id]?.trim()) ? 0.5 : 1,
                              transition: 'opacity 150ms',
                            }}
                          >
                            {isBusy ? 'GUARDANDO...' : '✓ CONFIRMAR PAGO'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Reject section */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        value={rejectNotes[row.id] ?? ''}
                        onChange={e => setNotes(p => ({ ...p, [row.id]: e.target.value }))}
                        placeholder="Motivo del rechazo (opcional)"
                        style={{
                          flex: 1, minWidth: '180px', background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(248,113,113,0.15)', borderRadius: '6px',
                          padding: '0.45rem 0.75rem', fontSize: '0.8rem',
                          color: 'hsl(var(--text-primary))', outline: 'none',
                          fontFamily: 'Rajdhani, sans-serif',
                        }}
                      />
                      <button
                        onClick={() => rejectWithdrawal(row)}
                        disabled={isBusy}
                        style={{
                          padding: '0.5rem 0.85rem', borderRadius: '6px', cursor: 'pointer',
                          fontFamily: 'Orbitron, sans-serif', fontSize: '0.58rem', letterSpacing: '0.08em',
                          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
                          color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem',
                          opacity: isBusy ? 0.5 : 1,
                        }}
                      >
                        <XCircle size={13} />
                        RECHAZAR Y DEVOLVER SALDO
                      </button>
                    </div>

                  </div>
                )}

                {/* Completed: show paid info */}
                {row.status === 'completed' && row.paid_at && (
                  <div style={{ borderTop: '1px solid rgba(16,185,129,0.15)', padding: '0.6rem 1.25rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                      Pagado: {new Date(row.paid_at).toLocaleString('es-ES')}
                    </span>
                    {row.tx_hash && (
                      <a
                        href={POLYGON_EXPLORER + row.tx_hash}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                      >
                        <ExternalLink size={11} />
                        {row.tx_hash.slice(0, 10)}…{row.tx_hash.slice(-8)}
                      </a>
                    )}
                  </div>
                )}

                {/* Failed: show notes */}
                {row.status === 'failed' && row.notes && (
                  <div style={{ borderTop: '1px solid rgba(248,113,113,0.15)', padding: '0.6rem 1.25rem' }}>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem', color: '#f87171' }}>
                      Motivo: {row.notes}
                    </span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
