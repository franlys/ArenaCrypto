
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStatus() {
  console.log("--- REVISANDO ESTADO DE PARTIDAS ---");
  
  const { data: matches, error: mErr } = await supabase
    .from('matches')
    .select('id, status, stake_amount, player1_id, player2_id')
    .neq('status', 'resolved')
    .limit(5);

  if (mErr) console.error("Error matches:", mErr);
  else console.log("Partidas no resueltas:", matches);

  const { data: subs, error: sErr } = await supabase
    .from('submissions')
    .select('id, match_id, ai_status, created_at')
    .limit(10);

  if (sErr) console.error("Error submissions:", sErr);
  else console.log("Últimas evidencias:", subs);
}

checkStatus();
