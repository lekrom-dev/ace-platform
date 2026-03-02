'use client'

/**
 * PostHog Provider
 * Wraps the app with PostHog initialization and user identification
 */

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, posthog } from './client'
import { useUser } from '@/hooks/useUser'

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Track page views
    if (pathname && typeof window !== 'undefined') {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()

  useEffect(() => {
    // Initialize PostHog only on client side
    if (typeof window !== 'undefined') {
      initPostHog()
    }
  }, [])

  useEffect(() => {
    // Identify user when auth state changes
    if (typeof window !== 'undefined') {
      if (user) {
        posthog.identify(user.id, {
          email: user.email,
        })
      } else {
        posthog.reset()
      }
    }
  }, [user])

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  )
}
