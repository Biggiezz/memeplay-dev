import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants.js';

let supabaseClientPromise = null;

/**
 * Lazy singleton Supabase client (no realtime, no session persistence).
 */
export async function getSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be used in the browser');
  }

  if (window.__supabaseClient) return window.__supabaseClient;
  if (supabaseClientPromise) return supabaseClientPromise;

  supabaseClientPromise = (async () => {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: { 'x-client-info': 'memeplay-templates-v2' }
      }
    });
    window.__supabaseClient = client;
    return client;
  })();

  return supabaseClientPromise;
}





