/**
 * Test Endpoint: Create Test Customer
 * Creates a test customer for development and testing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@ace/db'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    // Create a test auth user first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'test-tradie@yeahmate.ai',
      password: 'TestPassword123!',
      email_confirm: true,
    })

    // Get the user ID (either newly created or existing)
    let userId = authData?.user?.id

    if (!userId || authError?.message.includes('already registered')) {
      // User already exists, get their ID
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()

      if (listError) {
        return NextResponse.json(
          { error: 'Failed to list users', details: listError.message },
          { status: 500 },
        )
      }

      const existingUser = existingUsers.users.find((u) => u.email === 'test-tradie@yeahmate.ai')
      if (existingUser) {
        userId = existingUser.id
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Failed to get or create user' }, { status: 500 })
    }

    // Create customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .upsert(
        {
          auth_user_id: userId,
          email: 'test-tradie@yeahmate.ai',
          name: 'Test Tradie (Demo)',
          company: 'Test Plumbing Co',
          status: 'active',
        },
        {
          onConflict: 'auth_user_id',
        },
      )
      .select()
      .single()

    if (customerError) {
      return NextResponse.json(
        { error: 'Failed to create customer', details: customerError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      customer_id: customer.id,
      auth_user_id: userId,
      email: 'test-tradie@yeahmate.ai',
      message: 'Test customer created successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 },
    )
  }
}
