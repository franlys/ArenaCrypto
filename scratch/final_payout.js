
const { createClient } = require('@supabase/supabase-js');

const URL = "https://bcyzskbvcrqbzkuzihtn.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjeXpza2J2Y3JxYnprdXppaHRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzMzk4OSwiZXhwIjoyMDkxNTA5OTg5fQ.IOmtjr-HbsmIlnzuFXRtBPbtMj5DeBrSdlCy4hD92lA";

const supabase = createClient(URL, KEY);

async function finalTransfer() {
  const winnerId = '0954ce2a-1504-4af2-b86b-7b4fd843ea14'; // TEST2
  const prize = 180; // Bolsa de premios

  console.log(`Buscando billetera del ganador ${winnerId}...`);
  
  const { data: wallet, error: wErr } = await supabase
    .from('wallets')
    .select('balance_stablecoin')
    .eq('user_id', winnerId)
    .single();

  if (wErr) {
    console.error("Error al buscar billetera:", wErr);
    return;
  }

  const currentBalance = Number(wallet.balance_stablecoin || 0);
  const newBalance = currentBalance + prize;
  
  console.log(`Saldo actual: ${currentBalance} USDC. Sumando premio...`);

  const { error: uErr } = await supabase
    .from('wallets')
    .update({ balance_stablecoin: newBalance })
    .eq('user_id', winnerId);

  if (uErr) {
    console.error("Error al transferir fondos:", uErr);
  } else {
    console.log(`✅ ¡ÉXITO! Nuevo saldo de TEST2: ${newBalance} USDC.`);
    
    // Marcar definitivamente la partida como resuelta
    await supabase.from('matches').update({ status: 'resolved' }).eq('id', '866c3a1e-ab5b-45fe-832e-e78bdedbd11c');
    console.log("✅ Partida 866c3a1... marcada como RESOLVED.");
  }
}

finalTransfer();
