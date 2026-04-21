const BASE  = "https://api.pandascore.co";
const TOKEN = process.env.PANDASCORE_API_KEY!;

async function pandaGet<T = any>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}token=${TOKEN}`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error(`PandaScore ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface PandaMatch {
  id: number;
  name: string;
  status: "not_started" | "running" | "finished" | "cancelled";
  begin_at: string | null;
  end_at: string | null;
  videogame: { name: string; slug: string };
  league: { name: string; image_url: string | null };
  serie: { full_name: string };
  tournament: { name: string };
  opponents: Array<{
    opponent: { id: number; name: string; image_url: string | null };
    type: "Team" | "Player";
  }>;
  results: Array<{ team_id: number; score: number }>;
  winner?: { id: number; name: string } | null;
  draw: boolean;
  number_of_games: number | null;
}

export async function getLiveMatches(): Promise<PandaMatch[]> {
  try {
    return await pandaGet<PandaMatch[]>("/matches/running?sort=-begin_at&per_page=10");
  } catch {
    return [];
  }
}

export async function getUpcomingMatches(): Promise<PandaMatch[]> {
  try {
    return await pandaGet<PandaMatch[]>("/matches/upcoming?sort=begin_at&per_page=20");
  } catch {
    return [];
  }
}

export async function getMatchById(id: number): Promise<PandaMatch | null> {
  try {
    return await pandaGet<PandaMatch>(`/matches/${id}`);
  } catch {
    return null;
  }
}
