import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com service role key — bypassa o RLS.
 * Usar APENAS em API Routes server-side. Nunca expor no client.
 * Requer SUPABASE_SERVICE_ROLE_KEY no .env.local
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
