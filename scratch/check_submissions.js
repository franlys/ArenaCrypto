const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
