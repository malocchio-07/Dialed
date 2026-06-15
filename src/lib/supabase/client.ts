import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// Single browser client. The app is a static SPA (GitHub Pages), so the
// session lives entirely in the browser (localStorage), with no server
// component reading cookies.
let client: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }
  return client;
}
