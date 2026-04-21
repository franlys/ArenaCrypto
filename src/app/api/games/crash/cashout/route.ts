import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAnon } from '@/lib/supabase/server'
import { createClient }              from '@supabase/supabase-js'

const CRASH_K = 0.00006

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const { roundId } = await req.json()
  if (!roundId) return NextResponse.json({ error: 'roundId requerido' }, { status: 400 })

  const supabase = await createAnon()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = admin()

  // Validate round is still running
  const { data: round } = await db
    .from('crash_rounds')
    .select('id, status, started_at, crash_point')
    .eq('id', roundId)
    .single()

  if (!round || round.status !== 'running') {
    return NextResponse.json({ error: 'La ronda ya terminó' }, { status: 409 })
  }

  const elapsed = Date.now() - new Date(round.started_at).getTime()
  const mult    = Math.exp(CRASH_K * elapsed)

  // Safety: don't allow cashout past crash point
  if (mult >= Number(round.crash_point)) {
    return NextResponse.json({ error: 'Demasiado tarde — ya explotó' }, { status: 409 })
  }

  const cashoutMult = Math.round(mult * 100) / 100

  // Get active bet
  const { data: bet } = await db
    .from('crash_bets')
    .select('id, amount, is_test')
    .eq('round_id', roundId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!bet) return NextResponse.json({ error: 'No tienes apuesta activa en esta ronda' }, { status: 400 })

  const payout = Math.floor(Number(bet.amount) * cashoutMult * 100) / 100
  const field  = bet.is_test ? 'test_balance' : 'balance_stablecoin'

  // Atomic cashout
  const { data: won } = await db
    .from('crash_bets')
    .update({ status: 'won', cashout_at: cashoutMult, payout })
    .eq('id', bet.id)
    .eq('status', 'active')
    .select('id')
    .maybeSingle()

  if (!won) return NextResponse.json({ error: 'Ya cobraste o la ronda terminó' }, { status: 409 })

  // Credit payout
  const { data: wallet } = await db.from('wallets').select(field).eq('user_id', user.id).single()
  if (wallet) {
    await db.from('wallets')
      .update({ [field]: Number((wallet as Record<string, unknown>)[field]) + payout })
      .eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true, cashoutAt: cashoutMult, payout })
}
