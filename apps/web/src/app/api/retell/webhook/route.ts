/**
 * Retell Webhook Handler
 * Receives events from Retell AI: call_started, call_ended, call_analyzed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@ace/db'
import { Retell } from 'retell-sdk'
import type { RetellWebhookEvent } from '@/lib/retell/types'

// Lazy-load Retell client (only at runtime, not during build)
let retellClient: Retell | null = null
function getRetellClient() {
  if (!retellClient) {
    const apiKey = process.env.RETELL_API_KEY
    if (!apiKey) {
      throw new Error(
        'RETELL_API_KEY environment variable is not set. Please add it in Vercel → Settings → Environment Variables',
      )
    }
    retellClient = new Retell({
      apiKey: apiKey,
    })
  }
  return retellClient
}

// Initialize Supabase with service role key for server-side operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook signature using Retell SDK
    const body = await request.text()
    const signature = request.headers.get('x-retell-signature')

    if (!signature) {
      console.error('[Retell Webhook] Missing signature header')
      return NextResponse.json({ error: 'Missing signature header' }, { status: 401 })
    }

    // Verify using Retell SDK (uses RETELL_API_KEY)
    const retell = getRetellClient()
    const isValid = retell.verify(body, process.env.RETELL_API_KEY!, signature)

    if (!isValid) {
      console.error('[Retell Webhook] Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    console.log('[Retell Webhook] Signature verified successfully')

    // 2. Parse webhook event
    const event: RetellWebhookEvent = JSON.parse(body)
    const { event: eventType, call } = event

    console.log(`[Retell Webhook] Received ${eventType} for call ${call.call_id}`)

    // 3. Find tradie config by agent_id
    const { data: tradieConfig, error: configError } = await supabase
      .from('tradie_configs')
      .select('id, customer_id')
      .eq('retell_agent_id', call.agent_id)
      .single()

    if (configError || !tradieConfig) {
      console.error('Tradie config not found for agent:', call.agent_id)
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // 4. Handle different event types
    switch (eventType) {
      case 'call_started':
        await handleCallStarted(call, tradieConfig)
        break

      case 'call_ended':
        await handleCallEnded(call, tradieConfig)
        break

      case 'call_analyzed':
        await handleCallAnalyzed(call, tradieConfig)
        break

      default:
        console.warn('Unknown event type:', eventType)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Retell Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleCallStarted(
  call: RetellWebhookEvent['call'],
  tradieConfig: { id: string; customer_id: string },
) {
  const { error } = await supabase.from('call_logs').insert({
    customer_id: tradieConfig.customer_id,
    tradie_config_id: tradieConfig.id,
    retell_call_id: call.call_id,
    call_status: 'in_progress',
    caller_phone: call.from_number || 'unknown',
    call_started_at: call.start_timestamp
      ? new Date(call.start_timestamp).toISOString()
      : new Date().toISOString(),
    outcome_type: 'information_only', // Default, will be updated on call_ended
    metadata: call.metadata || {},
  })

  if (error) {
    console.error('Failed to create call log:', error)
  }
}

async function handleCallEnded(
  call: RetellWebhookEvent['call'],
  tradieConfig: { id: string; customer_id: string },
) {
  // Calculate duration
  const durationSeconds = call.duration_ms ? Math.round(call.duration_ms / 1000) : null

  // Determine outcome type from call analysis or metadata
  const outcomeType = determineOutcomeType(call)

  const { error } = await supabase
    .from('call_logs')
    .update({
      call_status: 'completed',
      call_ended_at: call.end_timestamp
        ? new Date(call.end_timestamp).toISOString()
        : new Date().toISOString(),
      duration_seconds: durationSeconds,
      transcript: call.transcript || null,
      recording_url: call.recording_url || null,
      outcome_type: outcomeType,
      metadata: {
        ...call.metadata,
        public_log_url: call.public_log_url,
      },
    })
    .eq('retell_call_id', call.call_id)

  if (error) {
    console.error('Failed to update call log:', error)
  }

  // Create interaction record for CRM tracking
  await supabase.from('interactions').insert({
    customer_id: tradieConfig.customer_id,
    type: 'call',
    channel: 'phone',
    direction: call.call_type === 'inbound' ? 'inbound' : 'outbound',
    status: 'completed',
    outcome: outcomeType,
    notes: call.transcript?.substring(0, 500) || 'Call completed',
    metadata: {
      call_id: call.call_id,
      duration_seconds: durationSeconds,
      recording_url: call.recording_url,
    },
  })
}

async function handleCallAnalyzed(
  call: RetellWebhookEvent['call'],
  tradieConfig: { id: string; customer_id: string },
) {
  const analysis = call.call_analysis

  if (!analysis) {
    console.warn('No call analysis data provided')
    return
  }

  const { error } = await supabase
    .from('call_logs')
    .update({
      summary: analysis.call_summary || null,
      sentiment: analysis.user_sentiment || 'Unknown',
      metadata: {
        call_successful: analysis.call_successful,
        in_voicemail: analysis.in_voicemail,
        custom_analysis: analysis.custom_analysis_data,
      },
    })
    .eq('retell_call_id', call.call_id)

  if (error) {
    console.error('Failed to update call analysis:', error)
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function determineOutcomeType(
  call: RetellWebhookEvent['call'],
): Database['public']['Tables']['call_logs']['Row']['outcome_type'] {
  // Check if in voicemail
  if (call.call_analysis?.in_voicemail) {
    return 'voicemail'
  }

  // Check metadata for outcome hints
  const metadata = call.metadata || {}
  if (metadata.booking_created) return 'booking_created'
  if (metadata.callback_requested) return 'callback_requested'
  if (metadata.emergency_transfer) return 'emergency_transfer'

  // Check call duration - very short calls are likely hangups
  if (call.duration_ms && call.duration_ms < 10000) {
    return 'hung_up'
  }

  // Default to information_only
  return 'information_only'
}
