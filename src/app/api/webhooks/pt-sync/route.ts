// POST /api/webhooks/pt-sync
// Receives push events from Proyecto-Torneos (PT) and upserts into local mirror tables.
// PT fires this after every relevant mutation (tournament, team, participant, match).
//
// Payload: { event, table, data }
//   event: 'upsert' | 'delete'
//   table: 'tournaments' | 'teams' | 'participants' | 'matches'
//   data:  the PT row (camelCase from PT server actions)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const acAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isAuthorized(req: NextRequest) {
  const secret = req.headers.get("x-ac-secret");
  return secret === process.env.AC_WEBHOOK_SECRET;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event: string; table: string; data: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, table, data } = body;
  const syncedAt = new Date().toISOString();

  try {
    if (event === "upsert") {
      if (table === "tournaments") {
        const { error } = await acAdmin.from("ac_tournaments").upsert({
          pt_id:                 data.id,
          name:                  data.name,
          slug:                  data.slug,
          status:                data.status,
          format:                data.format,
          tournament_type:       data.tournamentType ?? data.tournament_type,
          mode:                  data.mode,
          level:                 data.level,
          arena_betting_enabled: data.arenaBettingEnabled ?? data.arena_betting_enabled,
          arena_betting_status:  data.arenaBettingStatus  ?? data.arena_betting_status,
          total_matches:         data.totalMatches   ?? data.total_matches,
          matches_completed:     data.matchesCompleted ?? data.matches_completed,
          logo_url:              data.logoUrl   ?? data.logo_url,
          start_date:            data.startDate ?? data.start_date,
          end_date:              data.endDate   ?? data.end_date,
          prize_1st:             data.prize1st  ?? data.prize_1st  ?? 0,
          prize_2nd:             data.prize2nd  ?? data.prize_2nd  ?? 0,
          prize_3rd:             data.prize3rd  ?? data.prize_3rd  ?? 0,
          entry_fee:             data.entryFee  ?? data.entry_fee  ?? 0,
          synced_at:             syncedAt,
        }, { onConflict: "pt_id" });
        if (error) throw error;

        if (data.status === "finished") {
          await acAdmin.from("bet_markets")
            .update({ status: "closed" })
            .eq("pt_tournament_id", data.id)
            .eq("status", "open");
        }

      } else if (table === "teams") {
        const { error } = await acAdmin.from("ac_teams").upsert({
          pt_id:            data.id,
          pt_tournament_id: data.tournamentId ?? data.tournament_id,
          name:             data.name,
          avatar_url:       data.avatarUrl  ?? data.avatar_url,
          stream_url:       data.streamUrl  ?? data.stream_url,
          synced_at:        syncedAt,
        }, { onConflict: "pt_id" });
        if (error) throw error;

      } else if (table === "participants") {
        const { error } = await acAdmin.from("ac_participants").upsert({
          pt_id:            data.id,
          pt_team_id:       data.teamId       ?? data.team_id,
          pt_tournament_id: data.tournamentId ?? data.tournament_id,
          display_name:     data.displayName  ?? data.display_name,
          stream_url:       data.streamUrl    ?? data.stream_url,
          total_kills:      data.totalKills   ?? data.total_kills   ?? 0,
          is_captain:       data.isCaptain    ?? data.is_captain    ?? false,
          synced_at:        syncedAt,
        }, { onConflict: "pt_id" });
        if (error) throw error;

      } else if (table === "matches") {
        const isCompleted = data.isCompleted ?? data.is_completed ?? false;
        const { error } = await acAdmin.from("ac_matches").upsert({
          pt_id:            data.id,
          pt_tournament_id: data.tournamentId  ?? data.tournament_id,
          name:             data.name,
          match_number:     data.matchNumber   ?? data.match_number,
          round_number:     data.roundNumber   ?? data.round_number   ?? 1,
          map_name:         data.mapName       ?? data.map_name,
          is_completed:     isCompleted,
          is_active:        data.isActive      ?? data.is_active      ?? false,
          is_warmup:        data.isWarmup      ?? data.is_warmup      ?? false,
          parent_match_id:  data.parentMatchId ?? data.parent_match_id ?? null,
          synced_at:        syncedAt,
        }, { onConflict: "pt_id" });
        if (error) throw error;

        if (isCompleted) {
          await acAdmin.from("bet_markets")
            .update({ status: "closed" })
            .eq("pt_match_id", data.id)
            .eq("status", "open");
        }
      }

    } else if (event === "delete") {
      const tableMap: Record<string, string> = {
        tournaments:  "ac_tournaments",
        teams:        "ac_teams",
        participants: "ac_participants",
        matches:      "ac_matches",
      };
      const mirrorTable = tableMap[table];
      if (mirrorTable) {
        await acAdmin.from(mirrorTable).delete().eq("pt_id", data.id);
      }
    }

    return NextResponse.json({ ok: true, table, event });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pt-sync] ${table}/${event} error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
