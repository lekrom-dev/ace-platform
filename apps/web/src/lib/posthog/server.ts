/**
 * PostHog Server Client
 * For tracking server-side events (API routes, webhooks)
 */

import { PostHog } from 'posthog-node'

export function getServerPostHog() {
  const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  })

  return posthog
}
