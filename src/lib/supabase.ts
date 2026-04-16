import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please check your .env.local file.');
}

// createBrowserClient creates a singleton — safe with React Strict Mode
// and avoids auth-token lock contention from multiple client instances.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
