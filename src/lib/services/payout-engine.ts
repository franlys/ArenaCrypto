import { createAdminClient } from '../supabase/server'
import { tournamentDb } from '../supabase/tournament-db'

/**
 * Payout Engine
 * 
 * Periodically checks for finished tournaments in the Bridge (PT)
 * and resolves pending bets in ArenaCrypto (AC).
 */
export async function processTournamentPayouts() {
  const supabase = await createAdminClient() // Local AC Client

  // 1. Get all pending bets from AC
  const { data: pendingBets, error: bErr } = await supabase
    .from('tournament_bets')
    .select('*')
    .eq('status', 'pending')

  if (bErr || !pendingBets || pendingBets.length === 0) return

  // 2. Identify unique tournament IDs to check in the Bridge
  const tournamentIds = Array.from(new Set(pendingBets.map(b => b.pt_tournament_id)))

  for (const tId of tournamentIds) {
    // 3. Check status of tournament in PT BRIDGE
    const { data: tournament, error: tErr } = await tournamentDb
      .from('tournaments')
      .select('status')
      .eq('id', tId)
      .single()

    if (tErr || !tournament || tournament.status !== 'finished') continue

    // 4. Resolve bets for this tournament in AC
    const tournamentBets = pendingBets.filter(b => b.pt_tournament_id === tId)

    // Pre-fetch results for different bet types
    // A. Winner (Rank 1 Team)
    const { data: winnerStanding } = await tournamentDb
      .from('team_standings')
      .select('team_id')
      .eq('tournament_id', tId)
      .eq('rank', 1)
      .single()

    // B. Top Fragger Tournament (Player with max total_kills)
    const { data: topFragger } = await tournamentDb
      .from('participants')
      .select('id, display_name')
      .eq('tournament_id', tId)
      .order('total_kills', { ascending: false })
      .limit(1)
      .single()

    for (const bet of tournamentBets) {
      let isWin = false
      const payoutMultiplier = 2.0 // Simple 2x for this implementation

      if (bet.target_type === 'winner' && winnerStanding) {
        isWin = (bet.pt_team_id === winnerStanding.team_id)
      } else if (bet.target_type === 'top_fragger_tournament' && topFragger) {
        isWin = (bet.pt_target_id === topFragger.id)
      }

      if (isWin) {
        const payoutAmount = bet.amount * payoutMultiplier 
        await supabase.from('tournament_bets').update({ status: 'won', resolved_at: new Date().toISOString() }).eq('id', bet.id)
        
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', bet.user_id).single()
        if (profile) {
          await supabase.from('profiles').update({ balance: Number(profile.balance) + payoutAmount }).eq('id', bet.user_id)
        }
      } else {
        await supabase.from('tournament_bets').update({ status: 'lost', resolved_at: new Date().toISOString() }).eq('id', bet.id)
      }
    }
  }
}
