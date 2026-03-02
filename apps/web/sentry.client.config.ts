import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://9516a6dac73ff890afff3760078b2455@o4510972546449408.ingest.us.sentry.io/4510972548939776',

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for testing
  // In production, reduce this to a lower value like 0.1 (10%)
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})
