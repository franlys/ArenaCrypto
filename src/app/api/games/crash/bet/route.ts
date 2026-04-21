import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAnon } from '@/lib/supabase/server'
import { createClient }              from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const { amount, isTest, autoCashout } = await req.json()

  if (!amount || amount < 0.5) return NextResponse.json({ error: 'Monto mínimo $0.50' }, { status: 400 })

  const supabase = await createAnon()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = admin()

  // Get current waiting round
  const { data: round } = await db
    .from('crash_rounds')
    .select('id, status')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!round) return NextResponse.json({ error: 'No hay ronda en fase de apuestas' }, { status: 409 })

  // Check wallet
  const { data: wallet } = await db.from('wallets').select('balance_stablecoin, test_balance').eq('user_id', user.id).single()
  if (!wallet) return NextResponse.json({ error: 'Wallet no encontrada' }, { status: 400 })

  const field   = isTest ? 'test_balance' : 'balance_stablecoin'
  const balance = Number((wallet as Record<string, unknown>)[field])
  if (balance < amount) return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })

  // Deduct balance
  const { error: wErr } = await db.from('wallets')
    .update({ [field]: balance - amount })
    .eq('user_id', user.id)
  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 })

  // Place bet
  const { error: bErr } = await db.from('crash_bets').insert({
    round_id:     round.id,
    user_id:      user.id,
    amount,
    is_test:      isTest ?? false,
    auto_cashout: autoCashout ?? null,
    status:       'active',
  })

  if (bErr) {
    // Rollback
    await db.from('wallets').update({ [field]: balance }).eq('user_id', user.id)
    return NextResponse.json({ error: bErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, roundId: round.id })
}
