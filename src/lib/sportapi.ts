/**
 * SportAPI client — wrapper sobre sportapi7.p.rapidapi.com (SofaScore data)
 * Proporciona eventos diarios, resultados y búsquedas para integrar
 * apuestas deportivas en ArenaCrypto.
 */

const HOST = process.env.SPORTAPI_HOST ?? "sportapi7.p.rapidapi.com";
const KEY  = process.env.RAPIDAPI_KEY!;

const SPORT_SLUGS: Record<string, string> = {
  football:   "football",
  basketball: "basketball",
  baseball:   "baseball",
  tennis:     "tennis",
  mma:        "mma",
  esports:    "esports",
};

async function sportGet(path: string) {
  const res = await fetch(`https://${HOST}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-key": KEY,
      "x-rapidapi-host": HOST,
    },
    next: { revalidate: 60 }, // Cache 60 segundos en Next.js
  });
  if (!res.ok) throw new Error(`SportAPI ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Eventos programados para una fecha ───────────────────────────────────────
export async function getScheduledEvents(sport: string, date: string) {
  const slug = SPORT_SLUGS[sport] ?? sport;
  const data = await sportGet(`/api/v1/sport/${slug}/scheduled-events/${date}`);
  return (data.events ?? []) as SportEvent[];
}

// ── Eventos EN VIVO ───────────────────────────────────────────────────────────
export async function getLiveEvents(sport: string) {
  const slug = SPORT_SLUGS[sport] ?? sport;
  const data = await sportGet(`/api/v1/sport/${slug}/events/live`);
  return (data.events ?? []) as SportEvent[];
}

// ── Detalle de un evento (resultado final) ────────────────────────────────────
export async function getEventById(eventId: number | string) {
  const data = await sportGet(`/api/v1/event/${eventId}`);
  return data.event as SportEvent;
}

// ── Buscar torneos / ligas ────────────────────────────────────────────────────
export async function searchTournaments(query: string) {
  const data = await sportGet(`/api/v1/search/all?q=${encodeURIComponent(query)}`);
  return (data.results ?? []).filter((r: any) => r.type === "uniqueTournament");
}

// ── Eventos de un torneo específico en una fecha ─────────────────────────────
export async function getTournamentEvents(tournamentId: number, date: string) {
  const data = await sportGet(`/api/v1/unique-tournament/${tournamentId}/events/next/0`);
  return (data.events ?? []) as SportEvent[];
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface SportEvent {
  id: number;
  slug: string;
  tournament: {
    id: number;
    name: string;
    slug: string;
    category: { name: string; sport: { name: string; slug: string } };
  };
  homeTeam: { id: number; name: string; slug: string };
  awayTeam: { id: number; name: string; slug: string };
  homeScore?: { current: number; period1?: number; period2?: number };
  awayScore?: { current: number; period1?: number; period2?: number };
  status: {
    code: number;      // 0=not started, 6=in progress, 100=ended
    type: string;      // "notstarted" | "inprogress" | "finished"
    description: string;
  };
  startTimestamp: number; // Unix timestamp
  winnerCode?: number;    // 1=home wins, 2=away wins, 3=draw
}
