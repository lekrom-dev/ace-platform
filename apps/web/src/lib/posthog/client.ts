/**
 * PostHog Browser Client
 * Initialize PostHog for client-side analytics
 */

import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // We'll handle pageviews manually for more control
      capture_pageleave: true,
      autocapture: true,
      persistence: 'localStorage+cookie',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug()
        }
      },
    })
  }

  return posthog
}

export { posthog }
