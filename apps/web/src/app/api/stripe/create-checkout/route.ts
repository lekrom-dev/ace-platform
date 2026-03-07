import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

/**
 * API Route: Create Stripe Checkout Session
 *
 * Creates a Stripe Checkout session with referral discounts applied
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    const { priceId, planId } = await request.json()

    if (!priceId || !planId) {
      return NextResponse.json({ error: 'Missing priceId or planId' }, { status: 400 })
    }

    // Get user from session using proper server client
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 })
    }

    // Get customer record
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select(
        'id, email, name, stripe_customer_id, signup_discount_percentage, referral_discount_percentage',
      )
      .eq('auth_user_id', user.id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Calculate total discount
    const signupDiscount = customer.signup_discount_percentage || 0
    const referralDiscount = customer.referral_discount_percentage || 0
    const totalDiscount = Math.min(signupDiscount + referralDiscount, 100)

    // Create or get Stripe customer
    let stripeCustomerId = customer.stripe_customer_id

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: customer.name || undefined,
        metadata: {
          customer_id: customer.id,
          signup_discount: signupDiscount.toString(),
          referral_discount: referralDiscount.toString(),
        },
      })

      stripeCustomerId = stripeCustomer.id

      // Update customer record
      await supabaseAdmin
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', customer.id)
    }

    // Create discount coupon if applicable
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] = []

    if (totalDiscount > 0) {
      const couponId = `customer-${customer.id}-${totalDiscount}pct`

      try {
        // Try to get existing coupon
        await stripe.coupons.retrieve(couponId)
      } catch (error: any) {
        if (error.code === 'resource_missing') {
          // Create new coupon
          await stripe.coupons.create({
            id: couponId,
            percent_off: totalDiscount,
            duration: 'forever',
            name: `${totalDiscount}% Discount (Signup: ${signupDiscount}% + Referrals: ${referralDiscount}%)`,
          })
        }
      }

      discounts = [{ coupon: couponId }]
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      discounts,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/receptionist/setup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        customer_id: customer.id,
        plan_id: planId,
        signup_discount: signupDiscount.toString(),
        referral_discount: referralDiscount.toString(),
      },
      subscription_data: {
        metadata: {
          customer_id: customer.id,
          plan_id: planId,
          module_id: 'tradie-receptionist',
        },
      },
    })

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session', message: error.message },
      { status: 500 },
    )
  }
}
