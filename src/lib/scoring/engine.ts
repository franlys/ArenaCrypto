import type { TeamStanding, ScoringRule, Submission } from '@/types'

export interface MatchResult {
  teamId: string
  position: number
  kills: number
  potTop: boolean
}

export function calculateMatchPoints(
  rule: ScoringRule,
  position: number,
  kills: number
): number {
  const placement = rule.placementPoints[String(position)] ?? 0
  return placement + rule.killPoints * kills
}

export function calculateKillRate(totalKills: number, totalMatches: number): number {
  if (totalMatches === 0) return 0
  return totalKills / totalMatches
}

export function calculatePotTopCount(
  submissions: Pick<Submission, 'potTop' | 'status'>[]
): number {
  return submissions.filter((s) => s.potTop && s.status === 'approved').length
}

export function calculateTotalWithVip(points: number, vipScore: number): number {
  return points + vipScore
}

export function rankTeams(
  standings: Omit<TeamStanding, 'rank' | 'previousRank'>[],
  lastMatchPositions?: Record<string, number>
): TeamStanding[] {
  const sorted = [...standings].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills
    const posA = lastMatchPositions?.[a.teamId] ?? Infinity
    const posB = lastMatchPositions?.[b.teamId] ?? Infinity
    return posA - posB
  })
  return sorted.map((s, i) => ({ ...s, rank: i + 1 }))
}

export function computeStandings(
  approvedSubmissions: Submission[],
  rule: ScoringRule,
  config: {
    totalMatches: number
    teams: { id: string; name: string; avatarUrl?: string; vipScore: number }[]
    lastMatchPositions?: Record<string, number>
  }
): TeamStanding[] {
  const byTeam = new Map<string, Submission[]>()
  for (const team of config.teams) byTeam.set(team.id, [])
  for (const sub of approvedSubmissions) {
    if (!byTeam.has(sub.teamId)) byTeam.set(sub.teamId, [])
    byTeam.get(sub.teamId)!.push(sub)
  }

  const standings = config.teams.map((team) => {
    const subs = byTeam.get(team.id) ?? []
    const totalKills = subs.reduce((sum, s) => sum + s.killCount, 0)
    
    const totalPlacementPoints = subs.reduce((sum, s) => {
      const pos = s.rank || (s.potTop ? 1 : 0)
      const pRules = (rule.placementPoints as any) || {}
      const points = pos > 0 ? (Number(pRules[String(pos)]) || 0) : 0
      return sum + points
    }, 0)

    const potTopCount = calculatePotTopCount(subs)
    const killRate = calculateKillRate(totalKills, subs.length)
    const killPoints = totalKills * rule.killPoints
    const totalPoints = calculateTotalWithVip(killPoints + totalPlacementPoints, team.vipScore)

    return {
      teamId: team.id,
      teamName: team.name,
      avatarUrl: team.avatarUrl,
      totalPoints,
      totalKills,
      killRate,
      potTopCount,
      vipScore: team.vipScore,
    }
  })

  return rankTeams(standings, config.lastMatchPositions)
}

export function calculateKillRaceStandings(
  approvedSubmissions: Submission[],
  teams: { id: string; name: string; avatarUrl?: string; vipScore: number }[]
): TeamStanding[] {
  const killRaceRule: ScoringRule = {
    id: 'kill-race',
    tournament_id: '', // Adjusting for property name if needed
    killPoints: 1,
    placementPoints: {},
  } as any
  return computeStandings(approvedSubmissions, killRaceRule, { totalMatches: 1, teams })
}
