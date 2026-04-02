import { createClient } from '@supabase/supabase-js'

// Service role client for admin operations (cross-user mutations)
// Only use server-side in API routes - NEVER expose to client
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
