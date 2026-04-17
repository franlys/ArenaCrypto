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

// ── Mercados válidos según el tipo de torneo ─────────────────────────────────
// kill_race:         solo kills (no hay placement mecánico)
// battle_royale:     kills + posición + jugador individual
// deathmatch:        kills + ganador, sin placement
// eliminacion_directa: solo ganador por partida
// custom:            mínimo seguro (ganador + top fragger)

const ROUND_MARKETS_BY_TYPE: Record<string, string[]> = {
  kill_race:           ["round_top_fragger", "round_player_fragger"],
  battle_royale:       ["round_winner", "round_top_fragger", "round_top_placement", "round_player_fragger"],
  deathmatch:          ["round_winner", "round_top_fragger", "round_player_fragger"],
  eliminacion_directa: ["round_winner"],
  custom:              ["round_winner", "round_top_fragger"],
};

// Normaliza el campo format (enum de PT) o tournament_type al key del mapa
function resolveTournamentType(t: any): string {
  const raw = (t.tournament_type ?? t.format ?? "").toString().toLowerCase();
  if (raw.includes("kill_race") || raw.includes("killrace")) return "kill_race";
  if (raw.includes("battle_royale") || raw.includes("clasico"))  return "battle_royale";
  if (raw.includes("deathmatch"))                                return "deathmatch";
  if (raw.includes("eliminacion"))                               return "eliminacion_directa";
  if (raw.includes("custom") || raw.includes("custom_rooms"))    return "custom";
  return "battle_royale"; // fallback seguro
}

// Allow calls from:
// - Vercel Cron: Authorization: Bearer <CRON_SECRET>
// - Manual admin / webhook: x-cron-secret: <CRON_SECRET> or <SERVICE_ROLE_KEY>
function isAuthorized(req: NextRequest) {
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

  const results: Record<string, any>[] = [];

  // ── 1. Fetch betting-enabled tournaments from Kronix ────────────────────
  // Include "pending" so tournament_winner markets open BEFORE the event starts.
  // Users bet on the champion before any match is played — closes when first match goes live.
  const { data: tournaments, error: tErr } = await ptAnon
    .from("tournaments")
    .select("id, name, status, arena_betting_enabled, arena_betting_status, start_date, end_date, total_matches, matches_completed, tournament_type, format")
    .eq("arena_betting_enabled", true)
    .in("status", ["pending", "upcoming", "active", "finished"]);

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  for (const t of tournaments ?? []) {
    const log: Record<string, any> = { tournament_id: t.id, name: t.name, actions: [] };

    // ── 2. Open tournament-level markets (BEFORE tournament starts) ──────────
    // Opens as soon as arena_betting_enabled = true, regardless of whether the
    // tournament is pending or already active — as long as no match has started yet.
    // These markets close the moment the FIRST MATCH goes live (step 3.5 below).
    if (t.arena_betting_status !== "closed" && t.status !== "finished") {
      const marketTypes = ["tournament_winner", "tournament_mvp"];
      for (const mType of marketTypes) {
        const { error } = await acAdmin
          .from("bet_markets")
          .insert({ pt_tournament_id: t.id, market_type: mType, status: "open" })
          .select()
          .maybeSingle();
        // Unique constraint silently ignores duplicates
        if (!error) log.actions.push(`opened market: ${mType}`);
      }
    }

    // ── 3. Fetch ALL matches from Kronix for this tournament ──────────────
    // BETTING HAPPENS BEFORE ROUNDS — open markets for pending matches,
    // resolve markets for completed matches.
    const { data: allMatches } = await ptAnon
      .from("matches")
      .select("id, match_number, round_number, is_completed, is_active, completed_at")
      .eq("tournament_id", t.id)
      .eq("is_warmup", false)
      .order("match_number");

    const tournamentType  = resolveTournamentType(t);
    const roundMarketTypes = ROUND_MARKETS_BY_TYPE[tournamentType] ?? ROUND_MARKETS_BY_TYPE.battle_royale;
    log.actions.push(`tournament_type: ${tournamentType} → markets: [${roundMarketTypes.join(", ")}]`);

    // ── 3.5 Close tournament-level markets once ANY match has started ───────
    // tournament_winner/mvp = apuestas pre-torneo, válidas solo antes del primer pitazo.
    // Condition: is_active (en vivo ahora) OR is_completed (ya terminó).
    // Both mean "a match has started at some point" — the window is permanently closed.
    // If sync runs mid-match OR after, this still catches it correctly.
    const anyMatchHasStarted = (allMatches ?? []).some(
      (m: any) => m.is_active || m.is_completed
    );
    if (anyMatchHasStarted) {
      const { data: closedTournamentMarkets } = await acAdmin
        .from("bet_markets")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("pt_tournament_id", t.id)
        .in("market_type", ["tournament_winner", "tournament_mvp"])
        .eq("status", "open")
        .select("id");
      if (closedTournamentMarkets && closedTournamentMarkets.length > 0) {
        log.actions.push("closed tournament markets (primer partido iniciado → ventana pre-torneo cerrada)");
      }
    }

    for (const match of allMatches ?? []) {
      if (!match.is_completed && match.is_active) {
        // ── Match EN VIVO: cerrar mercados de ronda abiertos
        const { data } = await acAdmin
          .from("bet_markets")
          .update({ status: "closed", closed_at: new Date().toISOString() })
          .eq("pt_tournament_id", t.id)
          .eq("pt_match_id", match.id)
          .eq("status", "open")
          .select("id");
        if (data && data.length > 0) log.actions.push(`closed markets (match ${match.match_number} is live)`);

      } else if (!match.is_completed && !match.is_active) {
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
        // ── Completed match: close any remaining open markets, then resolve
        // Markets may already be "closed" if the match went through is_active=true.
        // We close any that are still "open" (safety net) then resolve all non-resolved.
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
          const resolvedAt = new Date().toISOString();

          // ── round_winner
          // kill_race: ganador = equipo con más kill_count
          // battle_royale / resto: ganador = rank === 1
          const winner = tournamentType === "kill_race"
            ? submissions.reduce((best: any, s: any) =>
                (s.kill_count > (best?.kill_count ?? -1) ? s : best), null)
            : submissions.find((s: any) => s.rank === 1);

          // Helper: resolve a market record AND settle all bets in one call
          const resolveAndSettle = async (
            marketType: string,
            update: { result_pt_team_id?: string | null; result_pt_player_id?: string | null },
          ) => {
            // 1. Find the market id
            const { data: mRow } = await acAdmin.from("bet_markets")
              .select("id")
              .eq("pt_tournament_id", t.id)
              .eq("market_type", marketType)
              .eq("pt_match_id", match.id)
              .in("status", ["open", "closed"])
              .maybeSingle();

            if (!mRow) return;

            // 2. Mark bet_markets as resolved
            await acAdmin.from("bet_markets").update({
              status: "resolved", resolved_at: resolvedAt, ...update,
            }).eq("id", mRow.id);

            // 3. Settle all bets via internal RPC (no auth required)
            const { data: settlement, error: sErr } = await acAdmin.rpc("resolve_market_internal", {
              p_market_id:           mRow.id,
              p_result_pt_team_id:   update.result_pt_team_id   ?? null,
              p_result_pt_player_id: update.result_pt_player_id ?? null,
            });

            if (sErr) {
              log.actions.push(`⚠ settle error ${marketType}: ${sErr.message}`);
            } else if (settlement?.error) {
              // "Market already resolved" is fine — idempotent
              if (settlement.error !== "Market already resolved") {
                log.actions.push(`⚠ settle warning ${marketType}: ${settlement.error}`);
              }
            } else {
              log.actions.push(
                `settled ${marketType} round ${match.match_number}: ` +
                `won=${settlement?.won_count ?? 0} lost=${settlement?.lost_count ?? 0} pool=$${settlement?.total_pool ?? 0}`
              );
            }
          };

          if (winner && roundMarketTypes.includes("round_winner")) {
            await resolveAndSettle("round_winner", { result_pt_team_id: winner.team_id });
          }

          // ── round_top_fragger (siempre por kill_count)
          const topFraggerTeam = submissions.reduce((best: any, s: any) =>
            (s.kill_count > (best?.kill_count ?? -1) ? s : best), null);

          if (topFraggerTeam && roundMarketTypes.includes("round_top_fragger")) {
            await resolveAndSettle("round_top_fragger", { result_pt_team_id: topFraggerTeam.team_id });
          }

          // ── round_top_placement (solo battle_royale: equipo con mejor rank / menor número)
          if (roundMarketTypes.includes("round_top_placement")) {
            const topPlacement = submissions
              .filter((s: any) => s.rank != null)
              .reduce((best: any, s: any) =>
                (best == null || s.rank < best.rank ? s : best), null);

            if (topPlacement) {
              await resolveAndSettle("round_top_placement", { result_pt_team_id: topPlacement.team_id });
            }
          }

          // ── round_player_fragger (kills individuales del JSONB player_kills)
          if (roundMarketTypes.includes("round_player_fragger")) {
            const playerKillMap: Record<string, number> = {};
            for (const s of submissions) {
              const pk = (s.player_kills as Record<string, number>) ?? {};
              for (const [pid, kills] of Object.entries(pk)) {
                playerKillMap[pid] = (playerKillMap[pid] ?? 0) + Number(kills);
              }
            }
            const topPlayerId = Object.entries(playerKillMap)
              .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

            if (topPlayerId) {
              await resolveAndSettle("round_player_fragger", { result_pt_player_id: topPlayerId });
            }
          }

          log.actions.push(`processed round ${match.match_number} (type: ${tournamentType})`);
        }
      }
    }

    // ── 3.5 Close tournament_winner/mvp when the FIRST MATCH goes live ───────
    // Betting on who wins the whole tournament is only valid BEFORE any match
    // is played. The moment the first match is live (is_active=true) or the
    // first match completes, we close these markets permanently.
    // This mirrors how real sports books handle pre-tournament outrights.
    const firstMatchIsLive    = (allMatches ?? []).some((m: any) => m.is_active && !m.is_completed);
    const anyMatchIsCompleted = (allMatches ?? []).some((m: any) => m.is_completed);

    if (firstMatchIsLive || anyMatchIsCompleted) {
      const { data: closedTournamentMarkets } = await acAdmin
        .from("bet_markets")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("pt_tournament_id", t.id)
        .in("market_type", ["tournament_winner", "tournament_mvp"])
        .eq("status", "open")
        .select("id");

      if (closedTournamentMarkets && closedTournamentMarkets.length > 0) {
        log.actions.push(
          firstMatchIsLive
            ? "closed tournament markets (primera partida EN VIVO)"
            : "closed tournament markets (ya hay partidas completadas)"
        );
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
        const { data: twMarket } = await acAdmin.from("bet_markets")
          .select("id").eq("pt_tournament_id", t.id).eq("market_type", "tournament_winner")
          .in("status", ["open", "closed"]).maybeSingle();

        if (twMarket) {
          await acAdmin.from("bet_markets").update({
            status: "resolved",
            result_pt_team_id: champion.team_id,
            closed_at: new Date().toISOString(),
            resolved_at: new Date().toISOString(),
          }).eq("id", twMarket.id);

          const { data: twSettlement } = await acAdmin.rpc("resolve_market_internal", {
            p_market_id:           twMarket.id,
            p_result_pt_team_id:   champion.team_id,
            p_result_pt_player_id: null,
          });
          log.actions.push(
            `settled tournament_winner: won=${twSettlement?.won_count ?? 0} lost=${twSettlement?.lost_count ?? 0} pool=$${twSettlement?.total_pool ?? 0}`
          );
        }
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
        const { data: mvpMarket } = await acAdmin.from("bet_markets")
          .select("id").eq("pt_tournament_id", t.id).eq("market_type", "tournament_mvp")
          .in("status", ["open", "closed"]).maybeSingle();

        if (mvpMarket) {
          await acAdmin.from("bet_markets").update({
            status: "resolved",
            result_pt_player_id: mvpId,
            closed_at: new Date().toISOString(),
            resolved_at: new Date().toISOString(),
          }).eq("id", mvpMarket.id);

          const { data: mvpSettlement } = await acAdmin.rpc("resolve_market_internal", {
            p_market_id:           mvpMarket.id,
            p_result_pt_team_id:   null,
            p_result_pt_player_id: mvpId,
          });
          log.actions.push(
            `settled tournament_mvp: won=${mvpSettlement?.won_count ?? 0} lost=${mvpSettlement?.lost_count ?? 0} pool=$${mvpSettlement?.total_pool ?? 0}`
          );
        }
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
  // KRONIX_WEBHOOK_URL must point to the PT deployment, e.g. https://proyecto-torneos.vercel.app
  const webhookUrl = `${process.env.KRONIX_WEBHOOK_URL ?? "https://proyecto-torneo-flcf.vercel.app"}/api/revenue-report`;

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
