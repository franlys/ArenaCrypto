
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const URL = "https://bcyzskbvcrqbzkuzihtn.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjeXpza2J2Y3JxYnprdXppaHRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzMzk4OSwiZXhwIjoyMDkxNTA5OTg5fQ.IOmtjr-HbsmIlnzuFXRtBPbtMj5DeBrSdlCy4hD92lA";

const supabase = createClient(URL, KEY);

async function applySql() {
  const sql = fs.readFileSync('scratch/update_commission.sql', 'utf8');
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) console.error("Error SQL:", error);
  else console.log("✅ Comisión actualizada al 3% con éxito.");
}

applySql();
