import { NextResponse } from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import crypto            from 'crypto'

const BETTING_MS     = 4_000
const BETWEEN_MS     = 2_000
const CRASH_K        = 0.00006
const MAX_MULT       = 100
const MAX_RUNTIME_MS = 90_000
const HOUSE_RTP      = 0.92

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
  if (h % 20 === 0) return { seed, point: 1.00 }
  const r     = h / 2 ** 32
  const point = Math.max(1.01, Math.min(MAX_MULT, Math.floor((HOUSE_RTP / (1 - r)) * 100) / 100))
  return { seed, point }
}

const FALLBACK = { roundId: null, phase: 'crashed', multiplier: 1.00, timeUntilStart: 0, bets: [] }

export async function GET() {
  try { return await getState() }
  catch (err) {
    console.error('[crash/state] error:', err)
    return NextResponse.json(FALLBACK, { headers: { 'Cache-Control': 'no-store' } })
  }
}

async function getState() {
  const admin = db()
  const now   = Date.now()

  // 1. Latest round (use DB clock — keeps ordering consistent)
  const { data: round } = await admin
    .from('crash_rounds').select('*')
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()

  let cur = round as Record<string, unknown> | null

  // ── A: crashed/no round → maybe start new one ──────────────────────────────
  if (!cur || cur.status === 'crashed') {
    const lastCrash      = cur?.crashed_at ? new Date(cur.crashed_at as string).getTime() : 0
    const timeSinceCrash = now - lastCrash

    if (timeSinceCrash >= BETWEEN_MS || !cur) {
      const { data: waiting } = await admin.from('crash_rounds').select('*')
        .eq('status', 'waiting').order('created_at', { ascending: false }).limit(1).maybeSingle()

      if (waiting) {
        cur = waiting
      } else {
        const { data: running } = await admin.from('crash_rounds').select('*')
          .eq('status', 'running').order('created_at', { ascending: false }).limit(1).maybeSingle()

        if (running) {
          cur = running  // Block C will crash it
        } else {
          const { seed, point } = generateCrashPoint()
          // Let DB set created_at (DB clock) — keeps ORDER BY created_at consistent
          const { data: newRound, error } = await admin.from('crash_rounds')
            .insert({ server_seed: seed, crash_point: point, status: 'waiting' })
            .select().single()
          if (newRound) cur = newRound
          else console.error('[crash/state] insert failed:', error?.message)
        }
      }
    }
  }

  // ── B: waiting → running ────────────────────────────────────────────────────
  if (cur && cur.status === 'waiting') {
    // Math.max(0,...) guards against DB/Vercel clock skew
    const waitedMs = Math.max(0, now - new Date(cur.created_at as string).getTime())
    if (waitedMs >= BETTING_MS) {
      const startedAt = new Date().toISOString()
      await admin.from('crash_rounds')
        .update({ status: 'running', started_at: startedAt })
        .eq('id', cur.id).eq('status', 'waiting')
      const { data: refetched } = await admin.from('crash_rounds').select('*').eq('id', cur.id as string).single()
      if (refetched) cur = refetched
    }
  }

  // ── C: running — CRASH CHECK FIRST, then auto-cashouts ─────────────────────
  if (cur && cur.status === 'running') {
    const elapsed    = cur.started_at ? Math.max(0, now - new Date(cur.started_at as string).getTime()) : 0
    const mult       = Math.exp(CRASH_K * elapsed)
    const crashPoint = Number(cur.crash_point)

    // ⚡ Crash check BEFORE auto-cashouts — prevents function timeout hiding the crash
    const shouldCrash = !cur.started_at || mult >= crashPoint || mult >= MAX_MULT || elapsed >= MAX_RUNTIME_MS
    if (shouldCrash) {
      const safeCrashPoint = Math.min(mult > 1 ? Math.floor(mult * 100) / 100 : crashPoint, MAX_MULT)
      const crashedAt = new Date().toISOString()
      await admin.from('crash_bets').update({ status: 'lost' }).eq('round_id', cur.id).eq('status', 'active')
      await admin.from('crash_rounds').update({ status: 'crashed', crashed_at: crashedAt }).eq('id', cur.id)
      cur = { ...cur, status: 'crashed', crashed_at: crashedAt, crash_point: safeCrashPoint }
    } else {
      // Auto-cashouts only when round is still alive
      const { data: autoBets } = await admin.from('crash_bets')
        .select('id, user_id, amount, is_test, auto_cashout')
        .eq('round_id', cur.id).eq('status', 'active')
        .not('auto_cashout', 'is', null).lte('auto_cashout', mult)

      for (const bet of autoBets ?? []) {
        const cashoutMult = Number(bet.auto_cashout)
        const payout      = Math.floor(Number(bet.amount) * cashoutMult * 100) / 100
        const field       = bet.is_test ? 'test_balance' : 'balance_stablecoin'
        const { data: won } = await admin.from('crash_bets')
          .update({ status: 'won', cashout_at: cashoutMult, payout })
          .eq('id', bet.id).eq('status', 'active').select('id').maybeSingle()
        if (won) {
          const { data: w } = await admin.from('wallets').select(field).eq('user_id', bet.user_id).single()
          if (w) await admin.from('wallets')
            .update({ [field]: Number((w as Record<string, unknown>)[field]) + payout })
            .eq('user_id', bet.user_id)
        }
      }
    }
  }

  if (!cur) return NextResponse.json(FALLBACK, { headers: { 'Cache-Control': 'no-store' } })

  // 3. Bets for current round
  const { data: bets } = await admin.from('crash_bets')
    .select('user_id, amount, is_test, cashout_at, payout, status, auto_cashout')
    .eq('round_id', cur.id).order('created_at', { ascending: true })

  // 4. Response multiplier
  const elapsedForMult = cur.started_at ? Math.max(0, now - new Date(cur.started_at as string).getTime()) : 0
  const liveMult =
    cur.status === 'running' ? Math.min(Math.exp(CRASH_K * elapsedForMult), MAX_MULT) :
    cur.status === 'crashed' ? Math.min(Number(cur.crash_point), MAX_MULT) : 1.00

  const elapsed2       = Math.max(0, now - new Date(cur.created_at as string).getTime())
  const timeUntilStart = cur.status === 'waiting' ? Math.max(0, BETTING_MS - elapsed2) : 0

  return NextResponse.json({
    roundId:       cur.id,
    phase:         cur.status === 'waiting' ? 'betting' : cur.status,
    multiplier:    Math.round(liveMult * 100) / 100,
    crashPoint:    cur.status === 'crashed' ? Math.min(Number(cur.crash_point), MAX_MULT) : undefined,
    startedAt:     cur.started_at ? new Date(cur.started_at as string).getTime() : null,
    timeUntilStart,
    bets: (bets ?? []).map(b => ({
      amount:    Number(b.amount),
      isTest:    b.is_test,
      cashoutAt: b.cashout_at ? Number(b.cashout_at) : null,
      payout:    b.payout    ? Number(b.payout)     : null,
      status:    b.status,
    })),
    serverTime: now,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
