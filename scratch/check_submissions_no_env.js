const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bcyzskbvcrqbzkuzihtn.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjeXpza2J2Y3JxYnprdXppaHRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzMzk4OSwiZXhwIjoyMDkxNTA5OTg5fQ.IOmtjr-HbsmIlnzuFXRtBPbtMj5DeBrSdlCy4hD92lA';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkSubmissions() {
  const { data, error } = await supabase
    .from('submissions')
    .select('*, match:matches(*)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching submissions:', error);
    return;
  }

  console.log('Recent Submissions:', JSON.stringify(data, null, 2));
}

checkSubmissions();
