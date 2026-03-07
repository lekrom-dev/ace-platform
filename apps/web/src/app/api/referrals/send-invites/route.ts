import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * API Route: Send Referral Invites
 *
 * Schedules SMS invitations to be sent to potential referrals
 * SMS will be sent tomorrow, followed by a follow-up call
 */

export async function POST(request: NextRequest) {
  try {
    const { referralCode, phones, message } = await request.json()

    if (!referralCode || !phones || phones.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, referral_code')
      .eq('auth_user_id', user.id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Verify referral code matches
    if (customer.referral_code !== referralCode) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
    }

    // Normalize Australian phone numbers
    const normalizedPhones = phones.map((phone: string) => {
      let cleaned = phone.replace(/\s/g, '')

      // Convert 04XX XXX XXX to +614XX XXX XXX
      if (cleaned.startsWith('04')) {
        cleaned = '+61' + cleaned.substring(1)
      }
      // Ensure +61 prefix
      if (!cleaned.startsWith('+61')) {
        cleaned = '+61' + cleaned
      }

      return cleaned
    })

    // Calculate send time (tomorrow at 10 AM AEST)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)

    // Insert referral invitations
    const invitations = normalizedPhones.map((phone: string) => ({
      customer_id: customer.id,
      referral_code: referralCode,
      phone_number: phone,
      sms_message: message,
      scheduled_sms_at: tomorrow.toISOString(),
      status: 'scheduled',
    }))

    const { error: insertError } = await supabase.from('referral_invitations').insert(invitations)

    if (insertError) {
      console.error('Error inserting invitations:', insertError)
      return NextResponse.json({ error: 'Failed to schedule invitations' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: normalizedPhones.length,
      scheduledFor: tomorrow.toISOString(),
      message: `${normalizedPhones.length} invitation${normalizedPhones.length > 1 ? 's' : ''} scheduled`,
    })
  } catch (error) {
    console.error('Error in send-invites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
