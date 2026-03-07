import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API Route: Activate Referral
 *
 * Called when a customer activates their subscription
 * This transitions the referral from "pending" to "active" and triggers:
 * 1. Sets referred customer's signup_discount_percentage to 10%
 * 2. Updates referrer's referral_discount_percentage (10% per active referral)
 * 3. Marks referral as active with activated_at timestamp
 */

// Use service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function POST(request: NextRequest) {
  try {
    const { customerId, subscriptionId, moduleId } = await request.json()

    if (!customerId) {
      return NextResponse.json({ error: 'Missing customerId' }, { status: 400 })
    }

    // Find pending referral for this customer
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('referrals')
      .select('id, referrer_customer_id, referred_customer_id')
      .eq('referred_customer_id', customerId)
      .eq('status', 'pending')
      .single()

    if (referralError || !referral) {
      // No referral found - this is okay, not everyone is referred
      return NextResponse.json({
        success: true,
        message: 'No pending referral to activate',
      })
    }

    // Activate the referral using the database function
    const { error: activateError } = await supabaseAdmin.rpc('activate_referral', {
      p_referral_id: referral.id,
    })

    if (activateError) {
      console.error('Error activating referral:', activateError)
      return NextResponse.json({ error: 'Failed to activate referral' }, { status: 500 })
    }

    // Get updated stats
    const { data: referrer } = await supabaseAdmin
      .from('customers')
      .select('email, name, active_referrals_count, referral_discount_percentage')
      .eq('id', referral.referrer_customer_id)
      .single()

    const { data: referred } = await supabaseAdmin
      .from('customers')
      .select('email, name, signup_discount_percentage')
      .eq('id', referral.referred_customer_id)
      .single()

    console.log('✅ Referral activated:', {
      referrer: {
        name: referrer?.name,
        email: referrer?.email,
        activeReferrals: referrer?.active_referrals_count,
        discount: `${referrer?.referral_discount_percentage}%`,
      },
      referred: {
        name: referred?.name,
        email: referred?.email,
        signupDiscount: `${referred?.signup_discount_percentage}%`,
      },
    })

    return NextResponse.json({
      success: true,
      referral: {
        id: referral.id,
        referrerId: referral.referrer_customer_id,
        referredId: referral.referred_customer_id,
      },
      referrer: {
        activeReferrals: referrer?.active_referrals_count,
        discountPercentage: referrer?.referral_discount_percentage,
      },
      referred: {
        signupDiscount: referred?.signup_discount_percentage,
      },
    })
  } catch (error: any) {
    console.error('Error in activate-referral:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    )
  }
}
