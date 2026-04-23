
const { createClient } = require('@supabase/supabase-js');

const URL = "https://bcyzskbvcrqbzkuzihtn.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjeXpza2J2Y3JxYnprdXppaHRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzMzk4OSwiZXhwIjoyMDkxNTA5OTg5fQ.IOmtjr-HbsmIlnzuFXRtBPbtMj5DeBrSdlCy4hD92lA";

const supabase = createClient(URL, KEY);

async function updateBalance() {
  const winnerId = '0954ce2a-1504-4af2-b86b-7b4fd843ea14'; // TEST2
  const prize = 180; // (100 * 2) - 10% de comisión aprox

  console.log(`Buscando perfil del ganador ${winnerId}...`);
  
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('balance, username')
    .eq('id', winnerId)
    .single();

  if (pErr) {
    console.error("Error al buscar perfil:", pErr);
    return;
  }

  const newBalance = (profile.balance || 0) + prize;
  console.log(`Saldo actual de ${profile.username}: ${profile.balance}. Nuevo saldo: ${newBalance}`);

  const { error: uErr } = await supabase
    .from('profiles')
    .update({ balance: newBalance })
    .eq('id', winnerId);

  if (uErr) {
    console.error("Error al actualizar saldo:", uErr);
  } else {
    console.log("✅ SALDO ACTUALIZADO CON ÉXITO.");
  }
}

updateBalance();
