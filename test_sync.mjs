import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const envMap = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envMap[match[1].trim()] = match[2].trim();
  }
});

const acAdmin = createClient(
  envMap["NEXT_PUBLIC_SUPABASE_URL"],
  envMap["SUPABASE_SERVICE_ROLE_KEY"]
);

const ptAnon = createClient(
  envMap["NEXT_PUBLIC_PT_SUPABASE_URL"],
  envMap["NEXT_PUBLIC_PT_SUPABASE_ANON_KEY"]
);

const ROUND_MARKETS_BY_TYPE = {
  kill_race:           ["round_top_fragger", "round_player_fragger"],
  battle_royale:       ["round_winner", "round_top_fragger", "round_top_placement", "round_player_fragger"],
  deathmatch:          ["round_winner", "round_top_fragger", "round_player_fragger"],
  eliminacion_directa: ["round_winner"],
  custom:              ["round_winner", "round_top_fragger"],
};

function resolveTournamentType(t) {
  const raw = (t.tournament_type ?? t.format ?? "").toString().toLowerCase();
  if (raw.includes("kill_race") || raw.includes("killrace")) return "kill_race";
  if (raw.includes("battle_royale") || raw.includes("clasico"))  return "battle_royale";
  if (raw.includes("deathmatch"))                                return "deathmatch";
  if (raw.includes("eliminacion"))                               return "eliminacion_directa";
  if (raw.includes("custom") || raw.includes("custom_rooms"))    return "custom";
  return "battle_royale"; 
}

async function runSync() {
  console.log("Fetching tournaments...");
  const { data: tournaments, error: tErr } = await ptAnon
    .from("tournaments")
    .select("id, name, status, arena_betting_enabled, arena_betting_status, start_date, end_date, total_matches, matches_completed, tournament_type, format")
    .eq("arena_betting_enabled", true)
    .in("status", ["pending", "upcoming", "active", "finished"]);

  if (tErr) {
    console.error("Tournament fetch error:", tErr);
    return;
  }
  
  console.log(`Found ${tournaments?.length} tournaments`);

  for (const t of tournaments ?? []) {
     console.log(`Processing tournament ${t.name} (${t.status})`);
     const tournamentType  = resolveTournamentType(t);
     const roundMarketTypes = ROUND_MARKETS_BY_TYPE[tournamentType] ?? ROUND_MARKETS_BY_TYPE.battle_royale;

     const { data: allMatches } = await ptAnon
       .from("matches")
       .select("id, match_number, round_number, is_completed, is_active, completed_at")
       .eq("tournament_id", t.id)
       .eq("is_warmup", false)
       .order("match_number");

     console.log(`  Found ${allMatches?.length} matches`);

     for (const match of allMatches ?? []) {
       if (match.is_completed) {
         console.log(`  Match ${match.match_number} completed. Resolving...`);
         
         const { data: submissions } = await ptAnon
           .from("submissions")
           .select("team_id, kill_count, rank, pot_top, player_kills, status")
           .eq("match_id", match.id)
           .eq("status", "approved");

         if (submissions && submissions.length > 0) {
           const winner = tournamentType === "kill_race"
             ? submissions.reduce((best, s) => (s.kill_count > (best?.kill_count ?? -1) ? s : best), null)
             : submissions.find((s) => s.rank === 1);

           if (winner && roundMarketTypes.includes("round_winner")) {
             console.log(`    Trying to resolve round_winner for team ${winner.team_id}`);
             
             const { data: mRow } = await acAdmin.from("bet_markets")
               .select("id")
               .eq("pt_tournament_id", t.id)
               .eq("market_type", "round_winner")
               .eq("pt_match_id", match.id)
               .in("status", ["open", "closed"])
               .maybeSingle();

             if (mRow) {
                console.log(`      Found market ${mRow.id}. Calling resolve_market_internal...`);
                // Call RPC
                const { data: settlement, error: sErr } = await acAdmin.rpc("resolve_market_internal", {
                  p_market_id:           mRow.id,
                  p_result_pt_team_id:   winner.team_id   ?? null,
                  p_result_pt_player_id: null,
                });
                console.log(`      RPC Result: err=`, sErr, `data=`, settlement);
             }
           }
         } else {
             console.log(`    No approved submissions for match ${match.match_number}`);
         }
       }
     }
  }
}

runSync().then(() => console.log("Done")).catch(console.error);
