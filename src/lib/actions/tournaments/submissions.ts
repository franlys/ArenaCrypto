'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { submissionSchema } from '@/lib/validations/schemas'
import type { CreateSubmissionInput } from '@/lib/validations/schemas'
import type { Submission } from '@/types'
import { analyzeSubmissionImage } from '@/lib/services/ai-vision'

export async function createSubmission(
  data: CreateSubmissionInput
): Promise<{ data: Submission } | { error: string }> {
  const parsed = submissionSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Datos de envío inválidos' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: match, error: matchErr } = await supabase
    .from('tournament_matches')
    .select('tournament_id, is_completed, tournaments(status)')
    .eq('id', parsed.data.matchId)
    .single()

  if (matchErr || !match) return { error: 'Partida no encontrada' }
  if (match.is_completed) return { error: 'La partida ya está completada' }
  
  const tStatus = (match.tournaments as any)?.status
  if (tStatus !== 'active') return { error: 'El torneo no está activo' }

  // Ensure team is not already submitted for this match
  const { data: existing } = await supabase
    .from('tournament_submissions')
    .select('id')
    .eq('match_id', parsed.data.matchId)
    .eq('team_id', parsed.data.teamId)
    .single()

  if (existing) return { error: 'Este equipo ya tiene un registro para esta partida' }

  const { data: submission, error: subErr } = await supabase
    .from('tournament_submissions')
    .insert({
      tournament_id: parsed.data.tournamentId,
      match_id: parsed.data.matchId,
      team_id: parsed.data.teamId,
      submitted_by: parsed.data.submittedBy,
      kill_count: parsed.data.killCount,
      player_kills: parsed.data.playerKills || {},
      rank: parsed.data.rank || (parsed.data.potTop ? 1 : null),
      pot_top: parsed.data.potTop || parsed.data.rank === 1,
      status: 'pending',
    })
    .select()
    .single()

  if (subErr) return { error: subErr.message }

  if (parsed.data.evidence) {
    await supabase.from('tournament_evidence_files').insert({
      submission_id: submission.id,
      storage_path: parsed.data.evidence.storagePath,
      file_name: parsed.data.evidence.fileName,
      file_size: parsed.data.evidence.fileSize,
      mime_type: parsed.data.evidence.mimeType,
    })
    processAIValidation(submission.id, parsed.data.evidence.storagePath, parsed.data.evidence.mimeType)
      .catch(err => console.error('Background AI validation failed:', err))
  }

  return {
    data: {
      id: submission.id,
      tournamentId: submission.tournament_id,
      teamId: submission.team_id,
      matchId: submission.match_id,
      submittedBy: submission.submitted_by,
      killCount: submission.kill_count,
      playerKills: submission.player_kills,
      rank: submission.rank,
      potTop: submission.pot_top,
      status: submission.status,
      submittedAt: submission.submitted_at,
    }
  }
}

export async function recalculateStandings(supabase: any, tournamentId: string) {
  const { data: tourney } = await supabase.from('tournaments')
    .select('id, total_matches, format, scoring_rules(*)')
    .eq('id', tournamentId).single()
  
  if (!tourney) return

  const sRule = Array.isArray(tourney.scoring_rules) ? tourney.scoring_rules[0] : tourney.scoring_rules
  const rule = {
    id: sRule?.id,
    tournamentId: tourney.id,
    killPoints: Number(sRule?.kill_points ?? 1),
    placementPoints: sRule?.placement_points ?? {},
  }

  const { data: teams } = await supabase.from('teams').select('*').eq('tournament_id', tournamentId)
  const { data: subs } = await supabase.from('tournament_submissions')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('status', 'approved')
  
  if (!teams) return

  const { computeStandings } = await import('@/lib/scoring/engine')
  const standings = computeStandings(subs || [], rule, { 
    totalMatches: tourney.total_matches, 
    teams: teams.map(t => ({ id: t.id, name: t.name, vipScore: t.vip_score, avatarUrl: t.avatar_url })) 
  })

  const standingRows = standings.map(s => ({
    tournament_id: tournamentId,
    team_id: s.teamId,
    total_points: s.totalPoints,
    total_kills: s.totalKills,
    kill_rate: s.killRate,
    pot_top_count: s.potTopCount,
    vip_score: s.vipScore,
    rank: s.rank,
    previous_rank: s.previousRank || s.rank,
    updated_at: new Date().toISOString()
  }))

  await supabase.from('team_standings').upsert(standingRows, { onConflict: 'tournament_id,team_id' })
}

export async function approveSubmission(submissionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: sub } = await supabase.from('tournament_submissions').select('tournament_id').eq('id', submissionId).single()
  if (!sub) return { error: 'Envío no encontrado' }

  await supabase.from('tournament_submissions').update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', submissionId)
  await recalculateStandings(supabase, sub.tournament_id)

  return { success: true }
}

async function processAIValidation(submissionId: string, storagePath: string, mimeType: string) {
  const adminSupabase = await createAdminClient()
  try {
    await adminSupabase.from('tournament_submissions').update({ ai_status: 'processing' }).eq('id', submissionId)
    const { data: fileData } = await adminSupabase.storage.from('evidences').download(storagePath)
    if (!fileData) throw new Error('Download failed')

    const res = await analyzeSubmissionImage(Buffer.from(await fileData.arrayBuffer()), mimeType)
    if ('error' in res) throw new Error(res.error)

    await adminSupabase.from('tournament_submissions').update({
      ai_status: 'completed',
      ai_data: { team_name: res.teamName, kill_count: res.killCount, rank: res.rank },
      ai_confidence: res.confidence
    }).eq('id', submissionId)
  } catch (err: any) {
    await adminSupabase.from('tournament_submissions').update({ ai_status: 'failed', ai_error: err.message }).eq('id', submissionId)
  }
}
