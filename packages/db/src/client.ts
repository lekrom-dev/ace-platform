/**
 * Supabase client helpers
 * Creates typed Supabase clients with appropriate permissions
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Create a Supabase client with service role permissions
 * BYPASSES Row Level Security - use for server-side operations only
 * Can access prospects, opportunities, and perform admin operations
 */
export function createServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Create a Supabase client for browser use
 * Row Level Security is ENFORCED - users can only access their own data
 * Use for client-side operations and authenticated user requests
 */
export function createBrowserClient() {
  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}
