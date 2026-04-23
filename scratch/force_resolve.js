
const { createClient } = require('@supabase/supabase-js');

const URL = "https://bcyzskbvcrqbzkuzihtn.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjeXpza2J2Y3JxYnprdXppaHRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzMzk4OSwiZXhwIjoyMDkxNTA5OTg5fQ.IOmtjr-HbsmIlnzuFXRtBPbtMj5DeBrSdlCy4hD92lA";

const supabase = createClient(URL, KEY);

async function forceResolve() {
  const matchId = '866c3a1e-ab5b-45fe-832e-e78bdedbd11c';
  const winnerId = '0954ce2a-1504-4af2-b86b-7b4fd843ea14'; // TEST2 (Player 2)

  console.log(`Intentando resolver partida ${matchId} para el ganador ${winnerId}...`);

  const { data, error } = await supabase.rpc('resolve_match', {
    p_match_id: matchId,
    p_winner_id: winnerId,
    p_ai_data: { source: "manual_debug_fix" }
  });

  if (error) {
    console.error("❌ ERROR AL RESOLVER:", error.message, error.details, error.hint);
  } else {
    console.log("✅ PARTIDA RESUELTA CON ÉXITO:", data);
  }
}

forceResolve();
