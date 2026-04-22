'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RefreshCw } from 'lucide-react'

interface TestStats {
  total_test_balance: number
  users_with_test_balance: number
  crash_bets_total: number
  crash_bets_wagered: number
  crash_bets_won: number
  crash_bets_lost: number
  crash_bets_active: number
  crash_profit_house: number
  dice_rolls_total: number
  dice_rolls_wagered: number
  dice_rolls_won: number
  dice_rolls_lost: number
  dice_profit_house: number
  external_bets_total: number
  external_bets_wagered: number
  tournament_bets_total: number
  tournament_bets_wagered: number
}

const row = (label: string, value: string, accent?: string) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
    <span style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
    <span style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '0.78rem', color: accent ?? 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{value}</span>
  </div>
)

const section = (title: string, children: React.ReactNode) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.9rem 1rem', marginBottom: '0.75rem' }}>
    <p style={{ fontFamily: 'Orbitron,sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>{title}</p>
    {children}
  </div>
)

export default function TestEconomyPanel() {
  const [stats, setStats] = useState<TestStats | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_test_economy_stats')
    if (!error && data?.[0]) setStats(data[0])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalWagered = stats
    ? (stats.crash_bets_wagered + stats.dice_rolls_wagered + stats.external_bets_wagered + stats.tournament_bets_wagered)
    : 0
  const totalHouseProfit = stats ? (stats.crash_profit_house + stats.dice_profit_house) : 0

  return (
    <div style={{ marginTop: '2rem', background: 'var(--color-bg-card)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="font-orbitron" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>
          TEST ECONOMY
        </h3>
        <button
          onClick={load}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'Orbitron,sans-serif', opacity: loading ? 0.4 : 1 }}
        >
          <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          REFRESH
        </button>
      </div>

      {loading && !stats ? (
        <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '1rem' }}>Cargando...</p>
      ) : !stats ? (
        <p style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '0.8rem', color: '#ef4444', textAlign: 'center', padding: '1rem' }}>Error cargando stats de test</p>
      ) : (
        <>
          {section('RESUMEN GLOBAL', <>
            {row('Test balance en circulación', `$${Number(stats.total_test_balance).toFixed(2)}`, '#00F5FF')}
            {row('Usuarios con saldo test', String(stats.users_with_test_balance))}
            {row('Total wagered (todos los juegos)', `$${totalWagered.toFixed(2)}`)}
            {row('Ganancia casa (crash + dice)', `$${totalHouseProfit.toFixed(2)}`, totalHouseProfit >= 0 ? '#22c55e' : '#ef4444')}
          </>)}

          {section('CRASH GAME', <>
            {row('Apuestas totales', String(stats.crash_bets_total))}
            {row('Wagered', `$${Number(stats.crash_bets_wagered).toFixed(2)}`)}
            {row('Ganadas / Perdidas / Activas', `${stats.crash_bets_won} / ${stats.crash_bets_lost} / ${stats.crash_bets_active}`)}
            {row('Ganancia casa', `$${Number(stats.crash_profit_house).toFixed(2)}`, Number(stats.crash_profit_house) >= 0 ? '#22c55e' : '#ef4444')}
          </>)}

          {section('DICE', <>
            {row('Tiradas totales', String(stats.dice_rolls_total))}
            {row('Wagered', `$${Number(stats.dice_rolls_wagered).toFixed(2)}`)}
            {row('Ganadas / Perdidas', `${stats.dice_rolls_won} / ${stats.dice_rolls_lost}`)}
            {row('Ganancia casa', `$${Number(stats.dice_profit_house).toFixed(2)}`, Number(stats.dice_profit_house) >= 0 ? '#22c55e' : '#ef4444')}
          </>)}

          {section('DEPORTES & TORNEOS', <>
            {row('Apuestas deportivas test', String(stats.external_bets_total))}
            {row('Wagered deportes', `$${Number(stats.external_bets_wagered).toFixed(2)}`)}
            {row('Apuestas torneos test', String(stats.tournament_bets_total))}
            {row('Wagered torneos', `$${Number(stats.tournament_bets_wagered).toFixed(2)}`)}
          </>)}
        </>
      )}
    </div>
  )
}
