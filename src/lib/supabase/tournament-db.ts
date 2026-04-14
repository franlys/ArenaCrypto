import { createClient } from '@supabase/supabase-js'

/**
 * Tournament Database Client (Bridge)
 * 
 * This client connects to the SEPARATE Proyecto-torneos database.
 * Use this only for READ operations to fetch tournament data, matches, and standings.
 * All betting logic and user balances MUST use the local ArenaCrypto client.
 */

const ptUrl = process.env.NEXT_PUBLIC_PT_SUPABASE_URL!
const ptAnonKey = process.env.NEXT_PUBLIC_PT_SUPABASE_ANON_KEY!

if (!ptUrl || !ptAnonKey) {
  console.warn('Tournament Engine Bridge: Environment variables not found.')
}

export const tournamentDb = createClient(ptUrl, ptAnonKey, {
  auth: {
    persistSession: false, // AC users don't need a session in the PT DB
    autoRefreshToken: false,
  }
})

// Types for the Bridge
export type PT_Tournament = {
  id: string
  name: string
  slug: string
  status: 'draft' | 'active' | 'finished'
  arena_betting_enabled: boolean
  arena_betting_status: 'open' | 'closed' | 'paused'
  entry_fee: number
  prize_1st: number
  prize_2nd: number
  prize_3rd: number
  prize_mvp: number
  total_live_viewers: number
}
