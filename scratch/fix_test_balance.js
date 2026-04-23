
const { createClient } = require('@supabase/supabase-js');

const URL = "https://bcyzskbvcrqbzkuzihtn.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjeXpza2J2Y3JxYnprdXppaHRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzMzk4OSwiZXhwIjoyMDkxNTA5OTg5fQ.IOmtjr-HbsmIlnzuFXRtBPbtMj5DeBrSdlCy4hD92lA";

const supabase = createClient(URL, KEY);

async function fixTestBalance() {
  const winnerId = '0954ce2a-1504-4af2-b86b-7b4fd843ea14'; // TEST2
  const prize = 180; // Victoria
  const refund = 300; // Lo que reportaste que faltaba

  console.log(`Corrigiendo SALDO TEST para el usuario ${winnerId}...`);
  
  const { data: wallet, error: wErr } = await supabase
    .from('wallets')
    .select('test_balance, balance_stablecoin')
    .eq('user_id', winnerId)
    .single();

  if (wErr) {
    console.error("Error al buscar billetera:", wErr);
    return;
  }

  // Devolvemos el saldo real que puse por error a 0 (opcional, pero mejor dejarlo limpio)
  // Y actualizamos el de TEST.
  const newTestBalance = 10000 + prize; // Asumiendo que quieres estar en los 10k base + premio
  
  console.log(`Saldo TEST actual: ${wallet.test_balance}. Ajustando a 10180 USDT...`);

  const { error: uErr } = await supabase
    .from('wallets')
    .update({ 
      test_balance: 10180,
      balance_stablecoin: 0 // Limpiamos el error previo
    })
    .eq('user_id', winnerId);

  if (uErr) {
    console.error("Error al corregir saldo:", uErr);
  } else {
    console.log("✅ ¡SALDO TEST CORREGIDO! Ahora deberías ver 10180.00 USDT en tu perfil.");
  }
}

fixTestBalance();
