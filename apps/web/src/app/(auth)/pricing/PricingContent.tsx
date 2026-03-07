'use client'

/**
 * Pricing page content component
 * Separated to allow Suspense wrapping
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import Link from 'next/link'

interface Plan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  recommended?: boolean
  stripePriceId: string
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 39,
    interval: 'month',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || 'price_starter',
    features: [
      '50 calls per month',
      'Basic call handling',
      'Email notifications',
      'Business hours only',
      'Call transcripts',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 59,
    interval: 'month',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID || 'price_standard',
    features: [
      '150 calls per month',
      'Advanced AI conversations',
      'SMS + Email notifications',
      'Extended hours (6am-10pm)',
      'Call transcripts + summaries',
      'Booking calendar integration',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    interval: 'month',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro',
    recommended: true,
    features: [
      'Unlimited calls',
      'Advanced AI conversations',
      'SMS + Email notifications',
      '24/7 availability',
      'Call transcripts + summaries',
      'Booking calendar integration',
      'Emergency call transfer',
      'Priority support',
    ],
  },
  {
    id: 'maxi',
    name: 'Maxi',
    price: 169,
    interval: 'month',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_MAXI_PRICE_ID || 'price_maxi',
    features: [
      'Everything in Pro',
      'Custom AI voice training',
      'Multiple phone numbers',
      'Advanced analytics dashboard',
      'API access',
      'Dedicated account manager',
      'White-label option',
    ],
  },
]

export function PricingContent() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [loading, setLoading] = useState<string | null>(null)
  const [discounts, setDiscounts] = useState<{
    signupDiscount: number
    referralDiscount: number
    totalDiscount: number
  } | null>(null)

  useEffect(() => {
    if (!userLoading && user) {
      loadDiscounts()
    }
  }, [user, userLoading])

  async function loadDiscounts() {
    const supabase = createBrowserClient()

    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('signup_discount_percentage, referral_discount_percentage')
        .eq('auth_user_id', user!.id)
        .single()

      if (customer) {
        const signupDiscount = customer.signup_discount_percentage || 0
        const referralDiscount = customer.referral_discount_percentage || 0
        const totalDiscount = Math.min(signupDiscount + referralDiscount, 100)

        setDiscounts({
          signupDiscount,
          referralDiscount,
          totalDiscount,
        })
      }
    } catch (error) {
      console.error('Error loading discounts:', error)
    }
  }

  async function handleSelectPlan(plan: Plan) {
    if (!user) {
      router.push('/signup')
      return
    }

    setLoading(plan.id)

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          planId: plan.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      window.location.href = data.url
    } catch (error: unknown) {
      console.error('Error:', error)
      const message = error instanceof Error ? error.message : 'Failed to start checkout'
      alert(message)
      setLoading(null)
    }
  }

  function calculateDiscountedPrice(basePrice: number): number {
    if (!discounts || discounts.totalDiscount === 0) return basePrice
    const discount = (basePrice * discounts.totalDiscount) / 100
    return basePrice - discount
  }

  return (
    <div className="bg-white">
      <div className="w-full px-4 py-24 sm:py-32 sm:px-6 lg:px-12 xl:px-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Choose the right plan for your business
          </p>
        </div>

        {discounts && discounts.totalDiscount > 0 && (
          <div className="mx-auto max-w-2xl mt-8">
            <div className="rounded-lg bg-gradient-to-r from-green-50 to-blue-50 p-6 border-2 border-green-300">
              <div className="flex items-center justify-center">
                <span className="text-3xl mr-3">🎉</span>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-900">
                    You have {discounts.totalDiscount}% discount!
                  </p>
                  <div className="text-sm text-green-700 mt-1">
                    {discounts.signupDiscount > 0 && (
                      <span>Signup bonus: {discounts.signupDiscount}%</span>
                    )}
                    {discounts.signupDiscount > 0 && discounts.referralDiscount > 0 && (
                      <span> + </span>
                    )}
                    {discounts.referralDiscount > 0 && (
                      <span>Referral rewards: {discounts.referralDiscount}%</span>
                    )}
                  </div>
                  {discounts.totalDiscount === 100 && (
                    <p className="text-sm font-semibold text-green-800 mt-2">
                      🎊 Your service is completely FREE! 🎊
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
          Never miss a call again. Your AI receptionist works 24/7.
        </p>

        <div className="isolate mx-auto mt-16 grid max-w-[1600px] grid-cols-1 gap-6 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {plans.map((plan) => {
            const basePrice = plan.price
            const discountedPrice = calculateDiscountedPrice(basePrice)
            const hasDiscount = discounts && discounts.totalDiscount > 0

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-8 w-full ${
                  plan.recommended
                    ? 'ring-2 ring-blue-600 bg-gradient-to-br from-blue-50 to-white'
                    : 'ring-1 ring-gray-200 bg-white'
                }`}
              >
                {plan.recommended && (
                  <div className="flex items-center justify-between gap-x-4">
                    <h3 className="text-lg font-semibold leading-8 text-blue-600">{plan.name}</h3>
                    <p className="rounded-full bg-blue-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-blue-600">
                      Most popular
                    </p>
                  </div>
                )}
                {!plan.recommended && (
                  <h3 className="text-lg font-semibold leading-8 text-gray-900">{plan.name}</h3>
                )}

                <div className="mt-4 flex items-baseline gap-x-1">
                  {hasDiscount && discountedPrice !== basePrice ? (
                    <>
                      <span className="text-4xl font-bold tracking-tight text-gray-900">
                        ${discountedPrice}
                      </span>
                      <span className="text-xl font-semibold line-through text-gray-400">
                        ${basePrice}
                      </span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold tracking-tight text-gray-900">
                      ${basePrice}
                    </span>
                  )}
                  <span className="text-xs font-semibold leading-6 tracking-wide text-gray-600">
                    /{plan.interval}
                  </span>
                </div>

                {hasDiscount && discountedPrice !== basePrice && (
                  <p className="mt-2 text-sm text-green-600 font-medium">
                    Save ${basePrice - discountedPrice}/month ({discounts.totalDiscount}% off)
                  </p>
                )}

                <ul className="mt-6 space-y-2 text-sm leading-5 text-gray-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-x-2">
                      <svg
                        className="h-5 w-5 flex-none text-blue-600"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={loading === plan.id}
                  className={`mt-6 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    plan.recommended
                      ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-500 focus-visible:outline-blue-600'
                      : 'bg-white text-blue-600 ring-1 ring-inset ring-blue-200 hover:ring-blue-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.id ? 'Loading...' : 'Get started'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-gray-600">
            Not sure which plan?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-500">
              Contact us
            </Link>{' '}
            for help.
          </p>
          {!user && (
            <p className="mt-4 text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
