import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAnon } from '@/lib/supabase/server'
import { createClient }              from '@supabase/supabase-js'
import crypto                        from 'crypto'

const HOUSE_EDGE = 0.24 // 24% edge (76% RTP)
const MAX_BET = 1000

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function calcMultiplier(target: number, direction: 'over' | 'under'): number {
  const winChance = direction === 'over' ? (100 - target) / 100 : (target - 1) / 100
  if (winChance <= 0) return 0
  return Math.floor(((1 - HOUSE_EDGE) / winChance) * 100) / 100
}

function winChancePct(target: number, direction: 'over' | 'under'): number {
  return direction === 'over' ? 100 - target : target - 1
}

function rollDice(): number {
  const bytes = crypto.randomBytes(4)
  return (bytes.readUInt32BE(0) % 100) + 1  // 1-100
}

export async function POST(req: NextRequest) {
  const { amount, target, direction, isTest } = await req.json()

  if (!amount || amount < 0.5)                        return NextResponse.json({ error: 'Monto mínimo $0.50' }, { status: 400 })
  if (amount > MAX_BET)                               return NextResponse.json({ error: `La apuesta máxima es $${MAX_BET}` }, { status: 400 })
  if (!target || target < 2 || target > 98)           return NextResponse.json({ error: 'Target entre 2 y 98' }, { status: 400 })
  if (direction !== 'over' && direction !== 'under')  return NextResponse.json({ error: 'Direction inválido' }, { status: 400 })

  const supabase = await createAnon()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db    = admin()
  
  // SECURITY: Force test mode for test users
  const { data: profile } = await db.from("profiles").select("is_test_user").eq("id", user.id).single();
  let finalIsTest = isTest;
  if (profile?.is_test_user) {
    finalIsTest = true;
  }
  
  const field = finalIsTest ? 'test_balance' : 'balance_stablecoin'

  const { data: wallet } = await db.from('wallets').select('balance_stablecoin, test_balance').eq('user_id', user.id).single()
  if (!wallet) return NextResponse.json({ error: 'Wallet no encontrada' }, { status: 400 })

  const balance = Number((wallet as Record<string, unknown>)[field])
  if (balance < amount) return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })

  // Deduct bet
  const { error: wErr } = await db.from('wallets')
    .update({ [field]: balance - amount })
    .eq('user_id', user.id)
  if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 })

  // Roll
  const result     = rollDice()
  const multiplier = calcMultiplier(target, direction)
  const won        =
    direction === 'over'  ? result > target :
    result < target
  const payout     = won ? Math.floor(amount * multiplier * 100) / 100 : 0

  // Credit payout if won
  if (won) {
    await db.from('wallets')
      .update({ [field]: balance - amount + payout })
      .eq('user_id', user.id)
  }

  // Save roll
  await db.from('dice_rolls').insert({
    user_id: user.id, amount, is_test: finalIsTest ?? false,
    target, direction, result, won, multiplier, payout,
  })

  return NextResponse.json({ result, won, multiplier, payout, newBalance: balance - amount + payout })
}
