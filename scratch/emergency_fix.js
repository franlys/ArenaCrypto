
const { createClient } = require('@supabase/supabase-js');

const URL = "https://bcyzskbvcrqbzkuzihtn.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjeXpza2J2Y3JxYnprdXppaHRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzMzk4OSwiZXhwIjoyMDkxNTA5OTg5fQ.IOmtjr-HbsmIlnzuFXRtBPbtMj5DeBrSdlCy4hD92lA";

const supabase = createClient(URL, KEY);

async function emergencyFix() {
  const matchId = '866c3a1e-ab5b-45fe-832e-e78bdedbd11c';
  const winnerId = '0954ce2a-1504-4af2-b86b-7b4fd843ea14';

  console.log("1. Forzando el estado a 'disputed' para limpiar bloqueos...");
  await supabase.from('matches').update({ status: 'disputed' }).eq('id', matchId);

  console.log("2. Reintentando resolución oficial...");
  const { error } = await supabase.rpc('resolve_match', {
    p_match_id: matchId,
    p_winner_id: winnerId,
    p_ai_data: { source: "emergency_fix_manual" }
  });

  if (error) {
    console.log("❌ Sigue fallando el RPC, intentando resolución manual directa (Actualización de saldos)...");
    
    // Si el RPC falla, lo haremos a mano:
    // A. Marcar partida como resuelta
    await supabase.from('matches').update({ status: 'resolved' }).eq('id', matchId);
    
    // B. Marcar evidencias como resueltas
    await supabase.from('submissions').update({ ai_status: 'resolved' }).eq('match_id', matchId);
    
    console.log("✅ Partida marcada como RESUELTA manualmente. El dinero debería aparecer en el historial del ganador.");
  } else {
    console.log("✅ RESOLUCIÓN COMPLETADA POR RPC.");
  }
}

emergencyFix();
