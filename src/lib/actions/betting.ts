'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface PlaceBetInput {
  ptTournamentId: string
  ptTeamId: string | null
  amount: number
  targetType?: 'winner' | 'top_fragger_tournament' | 'top_fragger_match'
  ptTargetId?: string
  ptTargetName?: string
}

export async function placeTournamentBet({
  ptTournamentId,
  ptTeamId,
  amount,
  targetType = 'winner',
  ptTargetId,
  ptTargetName,
}: PlaceBetInput) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('place_tournament_bet', {
    p_pt_tournament_id: ptTournamentId,
    p_pt_team_id:       ptTeamId,
    p_amount:           amount,
    p_target_type:      targetType,
    p_pt_target_id:     ptTargetId ?? null,
    p_pt_target_name:   ptTargetName ?? null,
  })

  if (error) return { error: error.message }
  if (data?.error) return { error: data.error as string }

  revalidatePath('/tournaments')
  return { success: true }
}
