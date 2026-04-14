'use server'

import { createClient } from '@/lib/supabase/server'
import { tournamentDb } from '../supabase/tournament-db'
import { revalidatePath } from 'next/cache'

/**
 * Validates a streamer code from the PT Bridge and unlocks access for the AC user.
 */
export async function validateStreamerCode(tournamentId: string, code: string) {
  const supabase = await createClient()

  // 1. Get user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Debes iniciar sesión' }

  // 2. Check code in the BRIDGE (Project Tournaments)
  const { data: validCode, error: codeErr } = await tournamentDb
    .from('streamer_codes')
    .select('id, code, is_active')
    .eq('tournament_id', tournamentId)
    .eq('code', code.trim().toUpperCase())
    .eq('is_active', true)
    .single()

  if (codeErr || !validCode) {
    return { error: 'Código inválido o expirado' }
  }

  // 3. Insert unlock record locally in ArenaCrypto
  const { error: unlockErr } = await supabase
    .from('tournament_unlocks')
    .insert({
      user_id: user.id,
      pt_tournament_id: tournamentId,
      code_id: validCode.id // We store the PT code ID for reference
    })

  if (unlockErr) {
    if (unlockErr.code === '23505') {
      return { success: true, message: 'El torneo ya estaba desbloqueado' }
    }
    return { error: 'Error al procesar el acceso' }
  }

  revalidatePath(`/tournaments/${tournamentId}`)
}
