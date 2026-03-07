import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

/**
 * Stripe Discount Management
 *
 * Handles two types of discounts:
 * 1. Signup Discount: 10% for customers referred by others (lifetime)
 * 2. Referral Discount: 10% per active referral (up to 100%)
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface CustomerDiscounts {
  signupDiscount: number // 0 or 10 (percentage)
  referralDiscount: number // 0-100 (percentage, 10% per active referral)
  totalDiscount: number // Combined (max 100%)
}

/**
 * Get all applicable discounts for a customer
 */
export async function getCustomerDiscounts(customerId: string): Promise<CustomerDiscounts> {
  const { data: customer } = await supabase
    .from('customers')
    .select('signup_discount_percentage, referral_discount_percentage')
    .eq('id', customerId)
    .single()

  if (!customer) {
    return {
      signupDiscount: 0,
      referralDiscount: 0,
      totalDiscount: 0,
    }
  }

  const signupDiscount = customer.signup_discount_percentage || 0
  const referralDiscount = customer.referral_discount_percentage || 0
  const totalDiscount = Math.min(signupDiscount + referralDiscount, 100)

  return {
    signupDiscount,
    referralDiscount,
    totalDiscount,
  }
}

/**
 * Create or update Stripe coupon for a customer's total discount
 */
export async function createOrGetDiscountCoupon(
  customerId: string,
  discounts: CustomerDiscounts,
): Promise<string | null> {
  if (discounts.totalDiscount === 0) {
    return null
  }

  // Create a unique coupon ID based on customer + discount
  const couponId = `customer-${customerId}-${discounts.totalDiscount}pct`

  try {
    // Try to retrieve existing coupon
    const existingCoupon = await stripe.coupons.retrieve(couponId)
    return existingCoupon.id
  } catch (error: any) {
    if (error.code === 'resource_missing') {
      // Create new coupon
      const coupon = await stripe.coupons.create({
        id: couponId,
        percent_off: discounts.totalDiscount,
        duration: 'forever',
        name: `${discounts.totalDiscount}% Discount (Signup: ${discounts.signupDiscount}% + Referrals: ${discounts.referralDiscount}%)`,
      })
      return coupon.id
    }
    throw error
  }
}

/**
 * Apply discount to a Stripe subscription
 */
export async function applyDiscountToSubscription(
  subscriptionId: string,
  customerId: string,
): Promise<void> {
  const discounts = await getCustomerDiscounts(customerId)

  if (discounts.totalDiscount === 0) {
    // No discount - remove any existing discount
    await stripe.subscriptions.update(subscriptionId, {
      coupon: '',
    })
    return
  }

  const couponId = await createOrGetDiscountCoupon(customerId, discounts)

  if (couponId) {
    await stripe.subscriptions.update(subscriptionId, {
      coupon: couponId,
    })
  }
}

/**
 * Update all subscriptions for a customer (when their discount changes)
 */
export async function updateCustomerSubscriptionDiscounts(
  customerId: string,
  stripeCustomerId: string,
): Promise<void> {
  const discounts = await getCustomerDiscounts(customerId)

  // Get all active subscriptions for this customer
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'active',
  })

  for (const subscription of subscriptions.data) {
    await applyDiscountToSubscription(subscription.id, customerId)
  }

  console.log(`✅ Updated ${subscriptions.data.length} subscriptions for customer ${customerId}:`, {
    signupDiscount: `${discounts.signupDiscount}%`,
    referralDiscount: `${discounts.referralDiscount}%`,
    totalDiscount: `${discounts.totalDiscount}%`,
  })
}

/**
 * Calculate final price after discounts
 */
export function calculateDiscountedPrice(basePrice: number, discounts: CustomerDiscounts): number {
  const discountAmount = (basePrice * discounts.totalDiscount) / 100
  return Math.max(0, basePrice - discountAmount)
}
