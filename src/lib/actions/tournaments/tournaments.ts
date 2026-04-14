'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createTournamentSchema, updateTournamentSchema } from '@/lib/validations/schemas'
import type { Tournament, ScoringRule } from '@/types'
import type { CreateTournamentInput, UpdateTournamentInput } from '@/lib/validations/schemas'

// ─── helpers ────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)

  const shortId = Math.random().toString(36).slice(2, 8)
  return `${base}-${shortId}`
}

function mapTournamentRow(row: Record<string, any>): Tournament {
  return {
    id: row.id,
    creatorId: row.creator_id,
    name: row.name,
    description: row.description || undefined,
    rulesText: row.rules_text || undefined,
    slug: row.slug,
    mode: row.mode,
    format: row.format,
    level: row.level,
    status: row.status,
    totalMatches: row.total_matches,
    matchesCompleted: row.matches_completed,
    killRateEnabled: row.kill_rate_enabled,
    potTopEnabled: row.pot_top_enabled,
    vipEnabled: row.vip_enabled,
    tiebreakerMatchEnabled: row.tiebreaker_match_enabled,
    killRaceTimeLimitMinutes: row.kill_race_time_limit_minutes || undefined,
    defaultRoundsPerMatch: row.default_rounds_per_match,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    championImageUrl: row.champion_image_url || undefined,
    logoUrl: row.logo_url || undefined,
    arenaBettingEnabled: row.arena_betting_enabled || false,
    arenaBettingStatus: row.arena_betting_status || 'closed',
    totalLiveViewers: row.total_live_viewers || 0,
  }
}

// ─── actions ────────────────────────────────────────────────────────────────

export async function createTournament(
  data: CreateTournamentInput
): Promise<{ data: Tournament } | { error: string }> {
  const parsed = createTournamentSchema.safeParse(data)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return { error: first?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const input = parsed.data
  const slug = generateSlug(input.name)

  // Insert tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .insert({
      creator_id: user.id,
      name: input.name,
      description: input.description ?? null,
      rules_text: input.rulesText ?? null,
      slug,
      mode: input.mode,
      format: input.format,
      level: input.level,
      status: 'draft',
      total_matches: input.totalMatches,
      kill_rate_enabled: input.killRateEnabled,
      pot_top_enabled: input.potTopEnabled,
      vip_enabled: input.vipEnabled,
      tiebreaker_match_enabled: input.tiebreakerMatchEnabled,
      kill_race_time_limit_minutes: input.killRaceTimeLimitMinutes ?? null,
      default_rounds_per_match: input.defaultRoundsPerMatch,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      arena_betting_enabled: input.arenaBettingEnabled,
    })
    .select()
    .single()

  if (tErr || !tournament) {
    return { error: tErr?.message ?? 'Error al crear el torneo' }
  }

  // Insert scoring rule
  const { error: srErr } = await supabase.from('scoring_rules').insert({
    tournament_id: tournament.id,
    kill_points: input.scoringRule.killPoints,
    placement_points: input.scoringRule.placementPoints,
  })

  if (srErr) {
    // Rollback tournament
    await supabase.from('tournaments').delete().eq('id', tournament.id)
    return { error: srErr.message }
  }

  // Create matches and rounds automatically
  for (let i = 0; i < input.totalMatches; i++) {
    const matchNumber = i + 1;
    // 1. Create Parent Match (Encounter)
    const { data: parentMatch, error: pmErr } = await supabase
      .from('tournament_matches')
      .insert({
        tournament_id: tournament.id,
        match_number: matchNumber,
        name: `Encuentro ${matchNumber}`,
      })
      .select()
      .single();

    if (pmErr) {
      await supabase.from('tournaments').delete().eq('id', tournament.id);
      return { error: pmErr.message };
    }

    // 2. Create Rounds (Child Matches) if more than 1 round is configured
    if (input.defaultRoundsPerMatch > 1) {
      const rounds = Array.from({ length: input.defaultRoundsPerMatch }, (_, rIdx) => ({
        tournament_id: tournament.id,
        parent_match_id: parentMatch.id,
        match_number: matchNumber,
        round_number: rIdx + 1,
        name: `Ronda ${rIdx + 1}`,
      }));

      const { error: rErr } = await supabase.from('tournament_matches').insert(rounds);
      if (rErr) {
        await supabase.from('tournaments').delete().eq('id', tournament.id);
        return { error: rErr.message };
      }
    }
  }

  return { data: mapTournamentRow(tournament) }
}

export async function updateTournament(
  id: string,
  data: UpdateTournamentInput
): Promise<{ data: Tournament } | { error: string }> {
  const parsed = updateTournamentSchema.safeParse(data)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return { error: first?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verify ownership and draft status
  const { data: existing, error: fetchErr } = await supabase
    .from('tournaments')
    .select('status, creator_id')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) return { error: 'Torneo no encontrado' }
  if (existing.creator_id !== user.id) return { error: 'Sin permisos' }
  if (existing.status !== 'draft') {
    return { error: 'No se puede modificar un torneo activo o finalizado' }
  }

  const input = parsed.data
  const updatePayload: any = {}

  if (input.name !== undefined) updatePayload.name = input.name
  if (input.description !== undefined) updatePayload.description = input.description
  if (input.rulesText !== undefined) updatePayload.rules_text = input.rulesText
  if (input.mode !== undefined) updatePayload.mode = input.mode
  if (input.format !== undefined) updatePayload.format = input.format
  if (input.level !== undefined) updatePayload.level = input.level
  if (input.totalMatches !== undefined) updatePayload.total_matches = input.totalMatches
  if (input.killRateEnabled !== undefined) updatePayload.kill_rate_enabled = input.killRateEnabled
  if (input.potTopEnabled !== undefined) updatePayload.pot_top_enabled = input.potTopEnabled
  if (input.vipEnabled !== undefined) updatePayload.vip_enabled = input.vipEnabled
  if (input.tiebreakerMatchEnabled !== undefined)
    updatePayload.tiebreaker_match_enabled = input.tiebreakerMatchEnabled
  if (input.killRaceTimeLimitMinutes !== undefined)
    updatePayload.kill_race_time_limit_minutes = input.killRaceTimeLimitMinutes
  if (input.defaultRoundsPerMatch !== undefined)
    updatePayload.default_rounds_per_match = input.defaultRoundsPerMatch
  if (input.startDate !== undefined) updatePayload.start_date = input.startDate || null
  if (input.endDate !== undefined) updatePayload.end_date = input.endDate || null
  if (input.logoUrl !== undefined) updatePayload.logo_url = input.logoUrl || null
  if (input.arenaBettingEnabled !== undefined) updatePayload.arena_betting_enabled = input.arenaBettingEnabled

  const { data: updated, error: updateErr } = await supabase
    .from('tournaments')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (updateErr || !updated) {
    return { error: updateErr?.message ?? 'Error al actualizar' }
  }

  // Update scoring rule if provided
  if (input.scoringRule) {
    await supabase
      .from('scoring_rules')
      .update({
        kill_points: input.scoringRule.killPoints,
        placement_points: input.scoringRule.placementPoints,
      })
      .eq('tournament_id', id)
  }

  return { data: mapTournamentRow(updated) }
}

export async function activateTournament(
  id: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: tournament, error: fetchErr } = await supabase
    .from('tournaments')
    .select('status, creator_id, format, kill_race_time_limit_minutes, arena_betting_enabled')
    .eq('id', id)
    .single()

  if (fetchErr || !tournament) return { error: 'Torneo no encontrado' }
  if (tournament.creator_id !== user.id) return { error: 'Sin permisos' }
  if (tournament.status !== 'draft') return { error: 'El torneo ya está activo o finalizado' }

  // Kill Race requires time limit
  if (tournament.format === 'kill_race' && !tournament.kill_race_time_limit_minutes) {
    return { error: 'Kill Race requiere un límite de tiempo configurado' }
  }

  const updatePayload: any = { status: 'active' }
  if (tournament.arena_betting_enabled) {
    updatePayload.arena_betting_status = 'open'
  }

  const { error: activateErr } = await supabase
    .from('tournaments')
    .update(updatePayload)
    .eq('id', id)

  if (activateErr) return { error: activateErr.message }
  
  revalidatePath(`/tournaments/${id}`)
  revalidatePath('/tournaments')
  
  return { success: true }
}

export async function deleteTournament(
  id: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: tournament, error: fetchErr } = await supabase
    .from('tournaments')
    .select('creator_id')
    .eq('id', id)
    .single()

  if (fetchErr || !tournament) return { error: 'Torneo no encontrado' }
  if (tournament.creator_id !== user.id) return { error: 'Sin permisos' }

  const { error: deleteErr } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id)

  if (deleteErr) return { error: deleteErr.message }

  revalidatePath('/tournaments')
  return { success: true }
}

export async function getTournaments(): Promise<{ data: Tournament[] } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return {
    data: (data ?? []).map((row) => mapTournamentRow(row)),
  }
}
