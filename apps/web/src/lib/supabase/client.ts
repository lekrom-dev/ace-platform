/**
 * Supabase client for Client Components
 * Uses browser cookies for authentication
 */

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import type { Database } from '@ace/db'

export function createBrowserClient() {
  return createSupabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
