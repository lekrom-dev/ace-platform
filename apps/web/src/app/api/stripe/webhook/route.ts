/**
 * Stripe Webhook Handler
 * Handles subscription lifecycle events from Stripe
 */

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Create subscription record
        const { error: subError } = await supabase.from('subscriptions').insert({
          customer_id: session.metadata?.customer_id,
          stripe_subscription_id: session.subscription as string,
          plan_id: session.metadata?.plan_id || 'unknown',
          status: 'active',
          current_period_start: new Date(Date.now()).toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })

        if (subError) {
          console.error('Error creating subscription:', subError)
        }

        // Activate referral if present
        if (session.metadata?.customer_id) {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/subscriptions/activate-referral`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: session.metadata.customer_id }),
          })
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          })
          .eq('stripe_subscription_id', subscription.id)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('customer_id')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (sub) {
          // Update subscription status
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id)

          // Churn any active referrals
          const { data: referrals } = await supabase
            .from('referrals')
            .select('id')
            .eq('referred_customer_id', sub.customer_id)
            .eq('status', 'active')

          if (referrals && referrals.length > 0) {
            for (const referral of referrals) {
              await supabase.rpc('churn_referral', { p_referral_id: referral.id })
            }
          }
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
