/**
 * POST /api/sports/sync
 * Cron Job diario — sincroniza eventos deportivos reales con ArenaCrypto
 *
 * Flujo:
 *  Mañana (8AM): Abre mercados para partidos programados del día
 *  Noche (11PM): Lee resultados finales → resuelve mercados + paga apostadores
 *
 * Authorization: Bearer <CRON_SECRET>  o  x-cron-secret: <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getScheduledEvents,
  getLiveEvents,
  getEventById,
  type SportEvent,
} from "@/lib/sportapi";

const acAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// Deportes habilitados para apuestas (expandir cuando quieras)
const ENABLED_SPORTS = ["football", "basketball", "baseball"];

// Torneos filtrados — solo los más importantes (evitar basura)
// IDs de SofaScore/SportAPI
const FEATURED_TOURNAMENT_IDS = new Set([
  7,       // UEFA Champions League
  679,     // Premier League
  8,       // La Liga
  23,      // Serie A
  35,      // Bundesliga
  34,      // Ligue 1
  242,     // MLS
  132,     // NBA
  64,      // MLB
]);

function isAuthorized(req: NextRequest): boolean {
  const xSecret = req.headers.get("x-cron-secret");
  const bearer  = req.headers.get("authorization")?.replace("Bearer ", "");
  const token   = xSecret ?? bearer ?? "";
  return (
    token === process.env.CRON_SECRET ||
    token === process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = acAdmin();
  const today = new Date().toISOString().split("T")[0];
  const mode  = (await req.json().catch(() => ({})))?.mode ?? "open"; // "open" | "resolve"

  const results: Record<string, any>[] = [];

  for (const sport of ENABLED_SPORTS) {
    try {
      if (mode === "open") {
        // ── Fase 1: Abrir mercados para los partidos de hoy ─────────────────
        const events = await getScheduledEvents(sport, today);
        const featured = events.filter(
          (e) => FEATURED_TOURNAMENT_IDS.has(e.tournament.id) && e.status.type === "notstarted"
        );

        let opened = 0;
        for (const event of featured) {
          const marketData = {
            external_event_id:   String(event.id),
            external_sport:      sport,
            external_home_team:  event.homeTeam.name,
            external_away_team:  event.awayTeam.name,
            external_tournament: event.tournament.name,
            market_type:         "match_winner",
            status:              "open",
            starts_at:           new Date(event.startTimestamp * 1000).toISOString(),
          };

          const { error } = await db
            .from("external_bet_markets")
            .upsert(marketData, { onConflict: "external_event_id,market_type" });

          if (!error) opened++;
        }

        results.push({ sport, mode: "open", events_found: events.length, markets_opened: opened });

      } else {
        // ── Fase 2: Resolver mercados con los resultados de ayer/hoy ────────
        const { data: openMarkets } = await db
          .from("external_bet_markets")
          .select("id, external_event_id, external_sport")
          .eq("status", "open")
          .eq("external_sport", sport);

        let resolved = 0;
        for (const market of openMarkets ?? []) {
          const event = await getEventById(Number(market.external_event_id));

          if (event.status.type !== "finished" || event.winnerCode == null) continue;

          // winnerCode: 1=home, 2=away, 3=draw
          const winner =
            event.winnerCode === 1 ? event.homeTeam.name :
            event.winnerCode === 2 ? event.awayTeam.name :
            "draw";

          await db.from("external_bet_markets").update({
            status:      "resolved",
            winner_name: winner,
            home_score:  event.homeScore?.current ?? 0,
            away_score:  event.awayScore?.current ?? 0,
            resolved_at: new Date().toISOString(),
          }).eq("id", market.id);

          // Liquidar apuestas
          await db.rpc("resolve_external_market", {
            p_market_id:   market.id,
            p_winner_name: winner,
          });

          resolved++;
        }

        results.push({ sport, mode: "resolve", markets_resolved: resolved });
      }
    } catch (err: any) {
      results.push({ sport, error: err.message });
    }
  }

  return NextResponse.json({ ok: true, date: today, mode, results });
}

// GET — Para dispararlo manualmente desde el browser (solo cron secret en query)
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const mode   = req.nextUrl.searchParams.get("mode") ?? "open";

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Reutilizamos la lógica POST
  const fakeReq = new NextRequest(req.url, {
    method: "POST",
    headers: { "x-cron-secret": secret!, "content-type": "application/json" },
    body: JSON.stringify({ mode }),
  });

  return POST(fakeReq);
}
