/**
 * Sentry Test Route
 * Throws an error to verify Sentry is capturing exceptions
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

// Make this route dynamic so it's not pre-rendered
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Create and capture an error
    const error = new Error('Sentry Test Error - This is intentional for testing error tracking!')
    Sentry.captureException(error)

    // Also throw it to test automatic error capture
    throw error
  } catch (error) {
    // Capture again to be sure
    Sentry.captureException(error)

    return NextResponse.json(
      { message: 'Sentry test error triggered and captured!', error: String(error) },
      { status: 500 },
    )
  }
}
