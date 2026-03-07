/**
 * Pricing Page - Choose Your Plan
 * Shows 3 tiers with referral discount applied
 */

import { Suspense } from 'react'
import { PricingContent } from './PricingContent'

function PricingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingLoading />}>
      <PricingContent />
    </Suspense>
  )
}
