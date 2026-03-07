/**
 * API Route: Update Customer Address
 * Saves business address required for Twilio phone number provisioning
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { streetAddress, city, state, postcode } = body

    // Validate required fields
    if (!streetAddress || !city || !state || !postcode) {
      return NextResponse.json({ error: 'All address fields are required' }, { status: 400 })
    }

    // Validate Australian postcode format (4 digits)
    if (!/^\d{4}$/.test(postcode)) {
      return NextResponse.json({ error: 'Invalid postcode format (must be 4 digits)' }, { status: 400 })
    }

    // Update customer address
    const { error: updateError } = await supabaseAdmin
      .from('customers')
      .update({
        street_address: streetAddress,
        city: city,
        state: state,
        postcode: postcode,
      })
      .eq('auth_user_id', user.id)

    if (updateError) {
      console.error('Failed to update customer address:', updateError)
      return NextResponse.json({ error: 'Failed to save address' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating customer address:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    )
  }
}
