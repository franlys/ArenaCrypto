import { createBrowserClient } from '@supabase/ssr'

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

// createBrowserClient deduplicates by storageKey — safe in React Strict Mode
// and prevents the "Multiple GoTrueClient instances" warning caused by bare createClient
export const tournamentDb = createBrowserClient(ptUrl, ptAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
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
