'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function KronixBalance() {
  const supabase = createClient()
  const [balance, setBalance]   = useState<number | null>(null)
  const [pending, setPending]   = useState<{ id: string; amount: number; requested_at: string }[]>([])
  const [marking, setMarking]   = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)

  async function load() {
    const { data: bets } = await supabase
      .from('tournament_bets')
      .select('amount, payout_amount')
      .eq('is_test', true)
      .neq('status', 'canceled')

    const { data: rake } = await supabase
      .from('bet_markets')
      .select('rake_amount')
      .eq('status', 'resolved')

    const { data: withdrawals } = await supabase
      .from('kronix_withdrawals')
      .select('id, amount, status, requested_at')
      .order('requested_at', { ascending: false })

    const totalBet  = (bets ?? []).reduce((s, b) => s + Number(b.amount ?? 0), 0)
    const totalPay  = (bets ?? []).reduce((s, b) => s + Number(b.payout_amount ?? 0), 0)
    const totalRake = (rake ?? []).reduce((s, m) => s + Number(m.rake_amount ?? 0), 0)
    const paidOut   = (withdrawals ?? []).filter(w => w.status === 'paid').reduce((s, w) => s + Number(w.amount), 0)

    setBalance(totalBet - totalPay + totalRake - paidOut)
    setPending((withdrawals ?? []).filter(w => w.status === 'pending') as any)
    setLoading(false)
  }

  async function markPaid(id: string) {
    setMarking(id)
    await supabase
      .from('kronix_withdrawals')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id)
    await load()
    setMarking(null)
  }

  useEffect(() => { load() }, [])

  if (loading) return null

  return (
    <div style={{ marginTop: '2.5rem' }}>
      <h3 className="font-orbitron" style={{ fontSize: '1rem', letterSpacing: '0.15em', color: 'rgba(52,211,153,0.8)', marginBottom: '1rem' }}>
        SALDO KRONIX (PT)
      </h3>

      <div style={{
        background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(6,182,212,0.05))',
        border: '1px solid rgba(52,211,153,0.25)',
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <p style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'rgba(52,211,153,0.6)', fontFamily: 'Orbitron, sans-serif', marginBottom: '0.5rem' }}>
            GANANCIAS RETENIDAS — PENDIENTE DE TRANSFERIR
          </p>
          <p style={{ fontSize: '2.8rem', fontFamily: 'Orbitron, sans-serif', color: '#34d399', letterSpacing: '0.05em' }}>
            ${balance?.toFixed(2) ?? '0.00'}
            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>USDT</span>
          </p>
        </div>

        {pending.length > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(52,211,153,0.2)',
            borderRadius: '12px',
            padding: '1rem',
            minWidth: '260px',
          }}>
            <p style={{ fontSize: '0.55rem', letterSpacing: '0.12em', color: 'rgba(250,204,21,0.7)', fontFamily: 'Orbitron, sans-serif', marginBottom: '0.75rem' }}>
              SOLICITUDES DE RETIRO PENDIENTES
            </p>
            {pending.map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '1rem', color: '#34d399' }}>
                  ${Number(w.amount).toFixed(2)}
                </span>
                <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                  {new Date(w.requested_at).toLocaleDateString('es')}
                </span>
                <button
                  onClick={() => markPaid(w.id)}
                  disabled={marking === w.id}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '6px',
                    background: 'rgba(52,211,153,0.15)',
                    border: '1px solid rgba(52,211,153,0.4)',
                    color: '#34d399',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '0.55rem',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    opacity: marking === w.id ? 0.5 : 1,
                  }}
                >
                  {marking === w.id ? '...' : 'CONFIRMAR PAGO'}
                </button>
              </div>
            ))}
          </div>
        )}

        {pending.length === 0 && (
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)' }}>
            Sin solicitudes de retiro pendientes
          </p>
        )}
      </div>
    </div>
  )
}
