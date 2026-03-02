/**
 * Sentry Test Route
 * Throws an error to verify Sentry is capturing exceptions
 */

import { NextResponse } from 'next/server'

// Make this route dynamic so it's not pre-rendered
export const dynamic = 'force-dynamic'

export async function GET() {
  // This error should be captured by Sentry
  throw new Error('Sentry Test Error - This is intentional for testing error tracking!')

  // eslint-disable-next-line no-unreachable
  return NextResponse.json({ message: 'This should never be returned' })
}
