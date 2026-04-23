
const { createClient } = require('@supabase/supabase-js');

const URL = "https://bcyzskbvcrqbzkuzihtn.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjeXpza2J2Y3JxYnprdXppaHRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzMzk4OSwiZXhwIjoyMDkxNTA5OTg5fQ.IOmtjr-HbsmIlnzuFXRtBPbtMj5DeBrSdlCy4hD92lA";

const supabase = createClient(URL, KEY);

async function checkStatus() {
  console.log("--- REVISANDO ESTADO DE PARTIDAS ---");
  
  const { data: matches, error: mErr } = await supabase
    .from('matches')
    .select('id, status, stake_amount, player1_id, player2_id')
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(10);

  if (mErr) console.error("Error matches:", mErr);
  else console.log("Partidas no resueltas (Top 10):", matches);

  const { data: subs, error: sErr } = await supabase
    .from('submissions')
    .select('id, match_id, ai_status, created_at')
    .neq('ai_status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(10);

  if (sErr) console.error("Error submissions:", sErr);
  else console.log("Últimas evidencias pendientes:", subs);
}

checkStatus();
