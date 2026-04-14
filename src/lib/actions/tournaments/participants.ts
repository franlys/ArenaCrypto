'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { teamSchema, participantSchema } from '@/lib/validations/schemas'
import type { CreateTeamInput, CreateParticipantInput } from '@/lib/validations/schemas'
import type { Team, Participant } from '@/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseStreamUrl(url?: string): { platform?: string, id?: string } {
  if (!url) return {}
  try {
    const u = new URL(url)
    if (u.hostname.includes('twitch.tv')) {
      return { platform: 'twitch', id: u.pathname.slice(1) }
    }
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const v = u.searchParams.get('v') || u.pathname.slice(1)
      return { platform: 'youtube', id: v }
    }
    if (u.hostname.includes('kick.com')) {
      return { platform: 'kick', id: u.pathname.slice(1) }
    }
  } catch {}
  return {}
}

// ─── Teams ──────────────────────────────────────────────────────────────────

export async function createTeam(
  tournamentId: string,
  data: CreateTeamInput
): Promise<{ data: Team } | { error: string }> {
  const parsed = teamSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos de equipo inválidos' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verify tournament ownership
  const { data: tournament, error: authErr } = await supabase
    .from('tournaments')
    .select('creator_id')
    .eq('id', tournamentId)
    .single()

  if (authErr || !tournament || tournament.creator_id !== user.id) {
    return { error: 'Sin permisos para este torneo' }
  }

  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .insert({
      tournament_id: tournamentId,
      name: parsed.data.name,
      avatar_url: parsed.data.avatarUrl || null,
      stream_url: parsed.data.streamUrl || null,
    })
    .select()
    .single()

  if (teamErr) return { error: teamErr.message }

  const adminSupabase = await createAdminClient()
  await adminSupabase.from('team_standings').upsert({
    tournament_id: tournamentId,
    team_id: team.id,
    total_points: 0,
    total_kills: 0,
    kill_rate: 0,
    pot_top_count: 0,
    vip_score: 0,
    rank: 99,
    previous_rank: 99,
    updated_at: new Date().toISOString(),
  })

  return {
    data: {
      id: team.id,
      tournamentId: team.tournament_id,
      name: team.name,
      avatarUrl: team.avatar_url,
      streamUrl: team.stream_url,
      vipScore: team.vip_score,
    }
  }
}

export async function addParticipant(
  tournamentId: string,
  data: CreateParticipantInput
): Promise<{ data: Participant } | { error: string }> {
  const parsed = participantSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos de participante inválidos' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('creator_id')
    .eq('id', tournamentId)
    .single()

  if (!tournament || tournament.creator_id !== user.id) {
    return { error: 'Sin permisos' }
  }

  const { platform, id } = parseStreamUrl(parsed.data.streamUrl)

  const { data: participant, error: partErr } = await supabase
    .from('participants')
    .insert({
      tournament_id: tournamentId,
      display_name: parsed.data.displayName,
      contact_id: parsed.data.contactId || null,
      stream_url: parsed.data.streamUrl || null,
      stream_platform: platform || null,
      stream_id: id || null,
      team_id: parsed.data.teamId || null,
      is_captain: parsed.data.isCaptain,
    })
    .select()
    .single()

  if (partErr) return { error: partErr.message }

  return {
    data: {
      id: participant.id,
      tournamentId: participant.tournament_id,
      teamId: participant.team_id,
      displayName: participant.display_name,
      streamUrl: participant.stream_url,
      streamPlatform: participant.stream_platform,
      streamId: participant.stream_id,
      isCaptain: participant.is_captain,
      totalKills: participant.total_kills || 0,
    }
  }
}

export async function getTeamsWithParticipants(tournamentId: string) {
  const supabase = await createClient()
  
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true })

  if (teamsErr) return { error: teamsErr.message }

  const { data: participants, error: partErr } = await supabase
    .from('participants')
    .select('*')
    .eq('tournament_id', tournamentId)

  if (partErr) return { error: partErr.message }

  return { 
    teams: (teams || []).map(t => ({
      id: t.id,
      tournamentId: t.tournament_id,
      name: t.name,
      avatarUrl: t.avatar_url,
      streamUrl: t.stream_url,
      vipScore: t.vip_score,
    })), 
    participants: (participants || []).map(p => ({
      id: p.id,
      tournamentId: p.tournament_id,
      teamId: p.team_id,
      displayName: p.display_name,
      streamUrl: p.stream_url,
      streamPlatform: p.stream_platform,
      streamId: p.stream_id,
      isCaptain: p.is_captain,
      totalKills: p.total_kills || 0,
    }))
  }
}
