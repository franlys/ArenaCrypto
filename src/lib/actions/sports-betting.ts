'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

export interface PlaceExternalBetInput {
  eventId:        string
  sport:          string
  league:         string
  homeTeam:       string
  awayTeam:       string
  startTimestamp: number
  pickName:       string
  amount:         number
  isTest:         boolean
}

export async function placeExternalBet(input: PlaceExternalBetInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = await createAdminClient()

  // 1. Find or create market
  const { data: market, error: marketErr } = await admin
    .from('external_bet_markets')
    .upsert({
      external_event_id:   input.eventId,
      external_sport:      input.sport,
      external_tournament: input.league,
      external_home_team:  input.homeTeam,
      external_away_team:  input.awayTeam,
      market_type: 'match_winner',
      status: 'open',
      starts_at: new Date(input.startTimestamp * 1000).toISOString(),
    }, { onConflict: 'external_event_id,market_type' })
    .select()
    .single()

  if (marketErr) return { error: marketErr.message }

  // 2. Check wallet balance
  const { data: wallet } = await admin
    .from('wallets')
    .select('balance_stablecoin, test_balance')
    .eq('user_id', user.id)
    .single()

  if (!wallet) return { error: 'Wallet no encontrada' }

  const balance = input.isTest ? Number(wallet.test_balance) : Number(wallet.balance_stablecoin)
  if (balance < input.amount) return { error: 'Saldo insuficiente' }

  // 3. Deduct balance atomically
  const field = input.isTest ? 'test_balance' : 'balance_stablecoin'
  const { error: walletErr } = await admin
    .from('wallets')
    .update({ [field]: balance - input.amount })
    .eq('user_id', user.id)

  if (walletErr) return { error: walletErr.message }

  // 4. Insert bet
  const { data: bet, error: betErr } = await admin
    .from('external_bets')
    .insert({
      market_id: market.id,
      user_id:   user.id,
      pick_name: input.pickName,
      amount:    input.amount,
      is_test:   input.isTest,
      status:    'pending',
    })
    .select()
    .single()

  if (betErr) {
    // Rollback balance
    await admin.from('wallets').update({ [field]: balance }).eq('user_id', user.id)
    return { error: betErr.message }
  }

  return { data: bet }
}

export async function getUserExternalBets() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('external_bets')
    .select(`
      id, pick_name, amount, is_test, status, created_at,
      external_bet_markets (
        external_home_team, external_away_team, external_tournament,
        external_sport, starts_at, winner_name, home_score, away_score
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: data ?? [] }
}

export async function getMarketPool(marketId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('external_bets')
    .select('pick_name, amount')
    .eq('market_id', marketId)
    .eq('status', 'pending')

  if (!data) return {}

  const pools: Record<string, number> = {}
  for (const b of data) {
    pools[b.pick_name] = (pools[b.pick_name] ?? 0) + Number(b.amount)
  }
  return pools
}
