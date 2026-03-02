/**
 * Next.js Instrumentation
 * Used to initialize Sentry and other monitoring tools
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side initialization
    await import('./instrumentation.server')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime initialization
    await import('./instrumentation.edge')
  }
}
