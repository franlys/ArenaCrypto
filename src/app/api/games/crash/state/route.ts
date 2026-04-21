/**
 * GET /api/games/crash/state
 * Stateless state machine — advances round based on elapsed time.
 * Clients poll every 350ms. No cron needed.
 */
import { NextResponse } from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import crypto            from 'crypto'

const BETTING_MS     = 7_000    // betting phase duration
const BETWEEN_MS     = 4_000    // pause between rounds after crash
const CRASH_K        = 0.00006  // multiplier = e^(K * elapsed_ms)
const MAX_MULT       = 100      // hard cap
const MAX_RUNTIME_MS = 90_000   // force-crash any round stuck > 90s (≈100x)
const HOUSE_RTP      = 0.92     // 8% house edge

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
  if (h % 20 === 0) return { seed, point: 1.00 }  // ~5% instant crash
  const r     = h / 2 ** 32
  const point = Math.max(1.01, Math.min(MAX_MULT, Math.floor((HOUSE_RTP / (1 - r)) * 100) / 100))
  return { seed, point }
}

const FALLBACK_CRASHED = {
  roundId: null, phase: 'crashed', multiplier: 1.00, timeUntilStart: 0, bets: [],
}

export async function GET() {
  try {
    return await getState()
  } catch (err) {
    console.error('[crash/state] unhandled error:', err)
    return NextResponse.json(FALLBACK_CRASHED, { headers: { 'Cache-Control': 'no-store' } })
  }
}

async function forcecrash(admin: ReturnType<typeof db>, id: string, crashPoint: number) {
  const crashedAt = new Date().toISOString()
  await admin.from('crash_bets').update({ status: 'lost' }).eq('round_id', id).eq('status', 'active')
  await admin.from('crash_rounds').update({ status: 'crashed', crashed_at: crashedAt }).eq('id', id)
  return { status: 'crashed', crashed_at: crashedAt, crash_point: crashPoint }
}

async function getState() {
  const admin = db()
  const now   = Date.now()

  // 1. Get latest round
  const { data: round, error: fetchErr } = await admin
    .from('crash_rounds')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchErr) console.error('[crash/state] fetch round error:', fetchErr.message)

  let cur = round as Record<string, unknown> | null

  // ── A: crashed / no round → start new round ───────────────────────────────
  if (!cur || cur.status === 'crashed') {
    const lastCrash      = cur?.crashed_at ? new Date(cur.crashed_at as string).getTime() : 0
    const timeSinceCrash = now - lastCrash

    if (timeSinceCrash >= BETWEEN_MS || !cur) {
      // Look for a waiting round ONLY (skip stuck running rounds — Block C handles those)
      const { data: waiting } = await admin
        .from('crash_rounds').select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle()

      if (waiting) {
        cur = waiting
      } else {
        // Also check if there's a running round — hand off to Block C
        const { data: running } = await admin
          .from('crash_rounds').select('*')
          .eq('status', 'running')
          .order('created_at', { ascending: false })
          .limit(1).maybeSingle()

        if (running) {
          cur = running  // Block C will crash it
        } else {
          // Create fresh round
          const { seed, point } = generateCrashPoint()
          const { data: newRound, error: insertErr } = await admin
            .from('crash_rounds')
            .insert({ server_seed: seed, crash_point: point, status: 'waiting' })
            .select().single()
          if (newRound) {
            cur = newRound
          } else {
            console.error('[crash/state] insert failed:', insertErr?.message, insertErr?.code)
          }
        }
      }
    }
  }

  // ── B: waiting → running ────────────────────────────────────────────────────
  if (cur && cur.status === 'waiting') {
    const waitedMs = now - new Date(cur.created_at as string).getTime()
    if (waitedMs >= BETTING_MS) {
      const startedAt = new Date().toISOString()
      await admin.from('crash_rounds')
        .update({ status: 'running', started_at: startedAt })
        .eq('id', cur.id).eq('status', 'waiting')
      const { data: refetched } = await admin
        .from('crash_rounds').select('*').eq('id', cur.id as string).single()
      if (refetched) cur = refetched
    }
  }

  // ── C: running → check crash ────────────────────────────────────────────────
  if (cur && cur.status === 'running') {
    const elapsed    = cur.started_at ? now - new Date(cur.started_at as string).getTime() : 0
    const mult       = Math.exp(CRASH_K * elapsed)
    const crashPoint = Number(cur.crash_point)

    // Auto-cashouts
    const { data: autoBets } = await admin
      .from('crash_bets')
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

    // Crash: past crash_point, past MAX_MULT, or stuck > MAX_RUNTIME_MS
    const shouldCrash = mult >= crashPoint || mult >= MAX_MULT || elapsed >= MAX_RUNTIME_MS || !cur.started_at
    if (shouldCrash) {
      const safeCrashPoint = Math.min(crashPoint, MAX_MULT)
      const patch = await forcecrash(admin, cur.id as string, safeCrashPoint)
      cur = { ...cur, ...patch }
    }
  }

  if (!cur) return NextResponse.json(FALLBACK_CRASHED, { headers: { 'Cache-Control': 'no-store' } })

  // 3. Bets
  const { data: bets } = await admin
    .from('crash_bets')
    .select('user_id, amount, is_test, cashout_at, payout, status, auto_cashout')
    .eq('round_id', cur.id)
    .order('created_at', { ascending: true })

  // 4. Response multiplier
  const elapsed  = cur.started_at ? now - new Date(cur.started_at as string).getTime() : 0
  const liveMult =
    cur.status === 'running'  ? Math.min(Math.exp(CRASH_K * elapsed), MAX_MULT) :
    cur.status === 'crashed'  ? Math.min(Number(cur.crash_point), MAX_MULT)     : 1.00

  const timeUntilStart =
    cur.status === 'waiting'
      ? Math.max(0, BETTING_MS - (now - new Date(cur.created_at as string).getTime()))
      : 0

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
  }, { headers: { 'Cache-Control': 'no-store' } })
}
