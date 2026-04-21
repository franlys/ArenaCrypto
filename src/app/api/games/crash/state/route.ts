/**
 * GET /api/games/crash/state
 * Stateless state machine — advances round based on elapsed time.
 * Clients poll every 500ms. No cron needed.
 */
import { NextResponse } from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import crypto            from 'crypto'

const BETTING_MS  = 7_000   // betting phase duration
const BETWEEN_MS  = 4_000   // pause between rounds after crash
const CRASH_K     = 0.00006 // multiplier = e^(K * elapsed_ms)

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function generateCrashPoint(): { seed: string; point: number } {
  const seed = crypto.randomBytes(16).toString('hex')
  const hash = crypto.createHash('sha256').update(seed).digest('hex')
  const h    = parseInt(hash.slice(0, 8), 16)
  if (h % 33 === 0) return { seed, point: 1.00 }
  const r     = h / 2 ** 32
  const point = Math.max(1.01, Math.floor((0.97 / (1 - r)) * 100) / 100)
  return { seed, point }
}

export async function GET() {
  const admin = db()
  const now   = Date.now()

  // 1. Get latest round
  const { data: round } = await admin
    .from('crash_rounds')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let cur = round as Record<string, unknown> | null

  // 2. State machine transitions
  if (!cur || cur.status === 'crashed') {
    const lastCrash    = cur?.crashed_at ? new Date(cur.crashed_at as string).getTime() : 0
    const timeSinceCrash = now - lastCrash
    if (timeSinceCrash >= BETWEEN_MS || !cur) {
      const { seed, point } = generateCrashPoint()
      const { data: newRound } = await admin
        .from('crash_rounds')
        .insert({ server_seed: seed, crash_point: point, status: 'waiting' })
        .select()
        .single()
      cur = newRound
    }
  } else if (cur.status === 'waiting') {
    const waitedMs = now - new Date(cur.created_at as string).getTime()
    if (waitedMs >= BETTING_MS) {
      const { data: updated } = await admin
        .from('crash_rounds')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', cur.id)
        .eq('status', 'waiting')
        .select()
        .single()
      cur = updated ?? cur
    }
  } else if (cur.status === 'running') {
    const elapsed = now - new Date(cur.started_at as string).getTime()
    const mult    = Math.exp(CRASH_K * elapsed)

    // Process auto-cashouts
    const { data: autoBets } = await admin
      .from('crash_bets')
      .select('id, user_id, amount, is_test, auto_cashout')
      .eq('round_id', cur.id)
      .eq('status', 'active')
      .not('auto_cashout', 'is', null)
      .lte('auto_cashout', mult)

    for (const bet of autoBets ?? []) {
      const cashoutMult = Number(bet.auto_cashout)
      const payout      = Math.floor(Number(bet.amount) * cashoutMult * 100) / 100
      const field       = bet.is_test ? 'test_balance' : 'balance_stablecoin'

      // Atomic: only update if still active
      const { data: won } = await admin
        .from('crash_bets')
        .update({ status: 'won', cashout_at: cashoutMult, payout })
        .eq('id', bet.id)
        .eq('status', 'active')
        .select('id')
        .maybeSingle()

      if (won) {
        const { data: wallet } = await admin.from('wallets').select(field).eq('user_id', bet.user_id).single()
        if (wallet) {
          await admin.from('wallets')
            .update({ [field]: Number((wallet as Record<string, unknown>)[field]) + payout })
            .eq('user_id', bet.user_id)
        }
      }
    }

    // Check crash
    if (mult >= Number(cur.crash_point)) {
      await admin.from('crash_bets')
        .update({ status: 'lost' })
        .eq('round_id', cur.id)
        .eq('status', 'active')

      await admin.from('crash_rounds')
        .update({ status: 'crashed', crashed_at: new Date().toISOString() })
        .eq('id', cur.id)

      cur = { ...cur, status: 'crashed', crashed_at: new Date().toISOString() }
    }
  }

  if (!cur) return NextResponse.json({ error: 'No round' }, { status: 500 })

  // 3. Get bets for this round
  const { data: bets } = await admin
    .from('crash_bets')
    .select('user_id, amount, is_test, cashout_at, payout, status, auto_cashout')
    .eq('round_id', cur.id)
    .order('created_at', { ascending: true })

  // 4. Compute current multiplier for response
  const elapsed     = cur.started_at ? now - new Date(cur.started_at as string).getTime() : 0
  const liveMult    =
    cur.status === 'running'  ? Math.exp(CRASH_K * elapsed) :
    cur.status === 'crashed'  ? Number(cur.crash_point)      : 1.00

  const timeUntilStart =
    cur.status === 'waiting'
      ? Math.max(0, BETTING_MS - (now - new Date(cur.created_at as string).getTime()))
      : 0

  return NextResponse.json({
    roundId:       cur.id,
    phase:         cur.status === 'waiting' ? 'betting' : cur.status,
    multiplier:    Math.round(liveMult * 100) / 100,
    crashPoint:    cur.status === 'crashed' ? Number(cur.crash_point) : undefined,
    startedAt:     cur.started_at ? new Date(cur.started_at as string).getTime() : null,
    timeUntilStart,
    bets: (bets ?? []).map(b => ({
      amount:    Number(b.amount),
      isTest:    b.is_test,
      cashoutAt: b.cashout_at ? Number(b.cashout_at) : null,
      payout:    b.payout    ? Number(b.payout)     : null,
      status:    b.status,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
