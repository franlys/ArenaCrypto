import { NextRequest, NextResponse } from "next/server";

const PT_URL  = process.env.NEXT_PUBLIC_PT_SUPABASE_URL;
const PT_KEY  = process.env.NEXT_PUBLIC_PT_SUPABASE_ANON_KEY;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!PT_URL || !PT_KEY) {
    return NextResponse.json({ error: "PT not configured" }, { status: 503 });
  }

  const base = `${PT_URL}/rest/v1`;
  const headers = {
    apikey: PT_KEY,
    Authorization: `Bearer ${PT_KEY}`,
    "Content-Type": "application/json",
  };

  const [tournamentRes, matchesRes, teamsRes, standingsRes] = await Promise.all([
    fetch(`${base}/tournaments?id=eq.${params.id}&select=*&limit=1`, { headers }),
    fetch(`${base}/matches?tournament_id=eq.${params.id}&select=*&order=match_number.asc`, { headers }),
    fetch(`${base}/teams?tournament_id=eq.${params.id}&select=*`, { headers }),
    fetch(`${base}/team_standings?tournament_id=eq.${params.id}&select=*&order=rank.asc`, { headers }),
  ]);

  const [tournaments, matches, teams, standings] = await Promise.all([
    tournamentRes.json(),
    matchesRes.json(),
    teamsRes.json(),
    standingsRes.json(),
  ]);

  return NextResponse.json({
    tournament: Array.isArray(tournaments) ? tournaments[0] ?? null : null,
    matches:    Array.isArray(matches)     ? matches     : [],
    teams:      Array.isArray(teams)       ? teams       : [],
    standings:  Array.isArray(standings)   ? standings   : [],
  });
}
