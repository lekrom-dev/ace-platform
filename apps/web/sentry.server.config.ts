import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://9516a6dac73ff890afff3760078b2455@o4510972546449408.ingest.us.sentry.io/4510972548939776',

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for testing
  // In production, reduce this to a lower value like 0.1 (10%)
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
})
