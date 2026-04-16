// POST /api/markets/sync
// Sincroniza mercados de apuestas con el estado actual de Kronix.
// Llamado por: cron job, webhook de Kronix, o manualmente desde el panel admin.
//
// Lógica:
//  1. Lee torneos activos con arena_betting_enabled desde Kronix (bridge)
//  2. Abre mercados que aún no existen para esos torneos
//  3. Cierra mercados de rondas completadas
//  4. Cuando un torneo termina: resuelve mercados + calcula revenue + dispara webhook

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const acAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ptAnon = createClient(
  process.env.NEXT_PUBLIC_PT_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_PT_SUPABASE_ANON_KEY!
);

// Only allow calls with the service key or internal cron secret
function isAuthorized(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  return secret === process.env.CRON_SECRET || secret === process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any>[] = [];

  // ── 1. Fetch active betting-enabled tournaments from Kronix ──────────────
  const { data: tournaments, error: tErr } = await ptAnon
    .from("tournaments")
    .select("id, name, status, arena_betting_enabled, arena_betting_status, start_date, end_date, total_matches, matches_completed")
    .eq("arena_betting_enabled", true)
    .in("status", ["active", "finished"]);

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  for (const t of tournaments ?? []) {
    const log: Record<string, any> = { tournament_id: t.id, name: t.name, actions: [] };

    // ── 2. Open tournament-level markets if they don't exist ────────────────
    if (t.arena_betting_status === "open" && t.status === "active") {
      const marketTypes = ["tournament_winner", "tournament_mvp"];
      for (const mType of marketTypes) {
        const { error } = await acAdmin
          .from("bet_markets")
          .insert({ pt_tournament_id: t.id, market_type: mType, status: "open" })
          .select()
          .maybeSingle();
        // Unique index will prevent duplicates silently
        if (!error) log.actions.push(`opened market: ${mType}`);
      }
    }

    // ── 3. Fetch ALL matches from Kronix for this tournament ──────────────
    // BETTING HAPPENS BEFORE ROUNDS — open markets for pending matches,
    // resolve markets for completed matches.
    const { data: allMatches } = await ptAnon
      .from("matches")
      .select("id, match_number, round_number, is_completed, completed_at")
      .eq("tournament_id", t.id)
      .eq("is_warmup", false)
      .order("match_number");

    const roundMarketTypes = [
      "round_winner",
      "round_top_fragger",
      "round_top_placement",
      "round_player_fragger",
    ];

    for (const match of allMatches ?? []) {
      if (!match.is_completed) {
        // ── Pending match: create OPEN markets so viewers can bet before it starts
        for (const mType of roundMarketTypes) {
          await acAdmin.from("bet_markets").insert({
            pt_tournament_id: t.id,
            market_type:  mType,
            pt_match_id:  match.id,
            round_number: match.match_number,   // use match_number so each encounter gets its own tab
            status: "open",
          }).select().maybeSingle();
          // Unique index silently ignores duplicates
        }
        log.actions.push(`opened round markets: match ${match.match_number}`);
      } else {
        // ── Completed match: close open markets, then resolve with results
        await acAdmin.from("bet_markets").update({
          status: "closed",
          closed_at: match.completed_at ?? new Date().toISOString(),
        })
          .eq("pt_tournament_id", t.id)
          .eq("pt_match_id", match.id)
          .eq("status", "open");

        // Resolve using Kronix submission data
        const { data: submissions } = await ptAnon
          .from("submissions")
          .select("team_id, kill_count, rank, pot_top, player_kills, status")
          .eq("match_id", match.id)
          .eq("status", "approved");

        if (submissions && submissions.length > 0) {
          const winner         = submissions.find((s: any) => s.rank === 1);
          const topFraggerTeam = submissions.reduce((best: any, s: any) =>
            (s.kill_count > (best?.kill_count ?? -1) ? s : best), null
          );
          const playerKillMap: Record<string, number> = {};
          for (const s of submissions) {
            const pk = (s.player_kills as Record<string, number>) ?? {};
            for (const [pid, kills] of Object.entries(pk)) {
              playerKillMap[pid] = (playerKillMap[pid] ?? 0) + Number(kills);
            }
          }
          const topPlayerId = Object.entries(playerKillMap)
            .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

          if (winner) {
            await acAdmin.from("bet_markets").update({
              status: "resolved",
              result_pt_team_id: winner.team_id,
              resolved_at: new Date().toISOString(),
            }).eq("pt_tournament_id", t.id).eq("market_type", "round_winner").eq("pt_match_id", match.id);
          }
          if (topFraggerTeam) {
            await acAdmin.from("bet_markets").update({
              status: "resolved",
              result_pt_team_id: topFraggerTeam.team_id,
              resolved_at: new Date().toISOString(),
            }).eq("pt_tournament_id", t.id).eq("market_type", "round_top_fragger").eq("pt_match_id", match.id);
          }
          if (topPlayerId) {
            await acAdmin.from("bet_markets").update({
              status: "resolved",
              result_pt_player_id: topPlayerId,
              resolved_at: new Date().toISOString(),
            }).eq("pt_tournament_id", t.id).eq("market_type", "round_player_fragger").eq("pt_match_id", match.id);
          }
          log.actions.push(`resolved round ${match.match_number}`);
        }
      }
    }

    // ── 4. Tournament finished: resolve tournament-level markets + revenue ──
    if (t.status === "finished") {
      const { data: standings } = await ptAnon
        .from("team_standings")
        .select("team_id, rank, total_kills")
        .eq("tournament_id", t.id)
        .order("rank", { ascending: true })
        .limit(3);

      const champion = standings?.[0];
      if (champion) {
        await acAdmin.from("bet_markets").update({
          status: "resolved",
          result_pt_team_id: champion.team_id,
          closed_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
        }).eq("pt_tournament_id", t.id).eq("market_type", "tournament_winner").eq("status", "open");

        log.actions.push(`resolved tournament_winner → team ${champion.team_id}`);
      }

      // Find tournament MVP from player_kills across all approved submissions
      const { data: allSubs } = await ptAnon
        .from("submissions")
        .select("player_kills, team_id")
        .eq("tournament_id", t.id)
        .eq("status", "approved");

      const killMap: Record<string, number> = {};
      for (const s of allSubs ?? []) {
        const pk = s.player_kills as Record<string, number> ?? {};
        for (const [pid, kills] of Object.entries(pk)) {
          killMap[pid] = (killMap[pid] ?? 0) + Number(kills);
        }
      }
      const mvpId = Object.entries(killMap).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (mvpId) {
        await acAdmin.from("bet_markets").update({
          status: "resolved",
          result_pt_player_id: mvpId,
          closed_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
        }).eq("pt_tournament_id", t.id).eq("market_type", "tournament_mvp").eq("status", "open");
        log.actions.push(`resolved tournament_mvp → player ${mvpId}`);
      }

      // Calculate revenue
      const { data: revenueData } = await acAdmin
        .rpc("calculate_tournament_revenue", {
          p_pt_tournament_id: t.id,
          p_tournament_name: t.name,
        });

      if (revenueData?.commission_amount > 0) {
        // Send webhook to Kronix (Option A)
        await sendKronixWebhook(revenueData);
        log.actions.push(`revenue calculated: $${revenueData.commission_amount} commission`);
      }
    }

    results.push(log);
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

async function sendKronixWebhook(revenue: any) {
  const KRONIX_URL = process.env.NEXT_PUBLIC_PT_SUPABASE_URL?.replace(".supabase.co", ".vercel.app") ?? "";
  const webhookUrl = `${process.env.KRONIX_WEBHOOK_URL ?? "https://arena-crypto.vercel.app"}/api/revenue-report`;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ac-secret": process.env.AC_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify({
        pt_tournament_id: revenue.pt_tournament_id,
        tournament_name:  revenue.tournament_name ?? "",
        total_volume:     revenue.total_volume,
        kronix_volume:    revenue.kronix_volume,
        commission_rate:  revenue.commission_rate,
        commission_amount: revenue.commission_amount,
        date: new Date().toISOString(),
      }),
    });

    const responseJson = await res.json().catch(() => ({}));

    // Mark as sent in our DB
    await acAdmin.from("kronix_revenue").update({
      status: "sent",
      webhook_sent_at: new Date().toISOString(),
      webhook_response: responseJson,
    }).eq("pt_tournament_id", revenue.pt_tournament_id);

  } catch (err: any) {
    await acAdmin.from("kronix_revenue").update({
      status: "failed",
      webhook_response: { error: err.message },
    }).eq("pt_tournament_id", revenue.pt_tournament_id);
  }
}
