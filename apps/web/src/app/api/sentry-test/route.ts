/**
 * Sentry Test Route
 * Throws an error to verify Sentry is capturing exceptions
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

// Make this route dynamic so it's not pre-rendered
export const dynamic = 'force-dynamic'

export async function GET() {
  // Trigger a test error for Sentry
  const error = new Error('Sentry Test Error - This is intentional for testing error tracking!')
  Sentry.captureException(error)

  return NextResponse.json(
    {
      message: 'Sentry test error triggered!',
      note: 'Check your Sentry dashboard to see this error',
    },
    { status: 200 },
  )
}
