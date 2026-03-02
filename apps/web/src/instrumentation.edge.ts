/**
 * Edge Runtime Sentry Initialization
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for testing
  // In production, reduce this to a lower value like 0.1 (10%)
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Set environment
  environment: process.env.NODE_ENV || 'development',
})
