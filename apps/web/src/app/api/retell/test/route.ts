/**
 * Retell Integration Test Endpoint
 * Tests API connectivity and credentials
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMasterRetellClient } from '@/lib/retell/client'

export async function GET(request: NextRequest) {
  try {
    // Check if API key is configured
    const apiKey = process.env.RETELL_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'RETELL_API_KEY not configured',
        message: 'Please add RETELL_API_KEY to your environment variables',
      })
    }

    // Check if webhook secret is configured
    const webhookSecret = process.env.RETELL_WEBHOOK_SECRET
    if (!webhookSecret) {
      return NextResponse.json({
        success: false,
        error: 'RETELL_WEBHOOK_SECRET not configured',
        message: 'Please add RETELL_WEBHOOK_SECRET to your environment variables',
      })
    }

    // Test API connectivity by listing calls (this won't return much if account is new)
    const client = createMasterRetellClient()

    try {
      // Try to list calls - this will verify API key works
      await client.listCalls({ limit: 1 })

      return NextResponse.json({
        success: true,
        message: 'Retell API credentials are valid!',
        config: {
          api_key_configured: true,
          webhook_secret_configured: true,
          webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/retell/webhook`,
          functions_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/retell/functions`,
          provision_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/retell/provision`,
        },
      })
    } catch (apiError: any) {
      return NextResponse.json({
        success: false,
        error: 'API key invalid or API error',
        message: apiError.message || 'Failed to connect to Retell API',
        details: apiError.toString(),
      })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      message: error.message || 'Unknown error',
    })
  }
}
