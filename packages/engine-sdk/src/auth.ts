/**
 * Authentication service
 * Provides methods for user verification, creation, and customer management
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@ace/db'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

type User = Database['public']['Tables']['customers']['Row']

interface AuthError {
  error: string
  code?: string
}

interface VerifyUserResult {
  user: User | null
  error?: string
}

interface CreateUserResult {
  user: User
  authUser: { id: string; email: string }
}

interface CreateUserMetadata {
  full_name?: string
  business_name?: string
  module_id?: string
}

/**
 * Verify a user's JWT token and return their profile
 */
export async function verifyUser(token: string): Promise<VerifyUserResult> {
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify the JWT token
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !authUser) {
      return {
        user: null,
        error: authError?.message || 'Invalid token',
      }
    }

    // Get the customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single()

    if (customerError || !customer) {
      return {
        user: null,
        error: 'Customer record not found',
      }
    }

    return { user: customer }
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create a new user programmatically
 * Bypasses email confirmation when using service role
 * Used by engine for converting leads to customers
 */
export async function createUser(
  email: string,
  password: string,
  metadata?: CreateUserMetadata,
): Promise<CreateUserResult | AuthError> {
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Create the auth user (bypasses email confirmation with service role)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email when created via service role
      user_metadata: metadata,
    })

    if (authError || !authData.user) {
      return {
        error: authError?.message || 'Failed to create auth user',
        code: authError?.code,
      }
    }

    // The trigger should have created the customer record automatically
    // Wait a moment for the trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Fetch the customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single()

    if (customerError || !customer) {
      return {
        error: 'Customer record not created by trigger',
        code: 'TRIGGER_FAILED',
      }
    }

    return {
      user: customer,
      authUser: {
        id: authData.user.id,
        email: authData.user.email!,
      },
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get the current user's customer record by auth user ID
 */
export async function getCustomer(authUserId: string): Promise<User | null> {
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single()

    if (error || !customer) {
      return null
    }

    return customer
  } catch {
    return null
  }
}

export const auth = {
  verifyUser,
  createUser,
  getCustomer,
}
