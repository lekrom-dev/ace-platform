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
    // Debug: Check if Sentry is available
    const sentryClient = Sentry.getClient()
    const sentryDebug = {
      clientExists: !!sentryClient,
      dsn: sentryClient?.getOptions()?.dsn || 'NOT SET',
      environment: sentryClient?.getOptions()?.environment || 'NOT SET',
    }

    console.log('[Sentry Debug]', sentryDebug)

    // Create and capture an error
    const error = new Error('Sentry Test Error - This is intentional for testing error tracking!')
    const eventId = Sentry.captureException(error)

    console.log('[Sentry] Captured exception with eventId:', eventId)

    // Also throw it to test automatic error capture
    throw error
  } catch (error) {
    // Capture again to be sure
    const eventId2 = Sentry.captureException(error)

    console.log('[Sentry] Captured exception with eventId2:', eventId2)

    return NextResponse.json(
      {
        message: 'Sentry test error triggered and captured!',
        error: String(error),
        sentryEventIds: [eventId2],
      },
      { status: 500 },
    )
  }
}
