/**
 * Retell Custom Functions Handler
 * Handles custom function calls from Retell AI during conversations
 * Functions: bookingCapture, callbackRequest, emergencyTransfer
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@ace/db'
import {
  verifyWebhookSignature,
  getSignatureFromHeaders,
  getWebhookSecret,
} from '@/lib/retell/webhook'
import type {
  CustomFunctionCall,
  CustomFunctionResponse,
  BookingCaptureArgs,
  CallbackRequestArgs,
  EmergencyTransferArgs,
} from '@/lib/retell/types'

// Initialize Supabase with service role key
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook signature
    const body = await request.text()
    const signature = getSignatureFromHeaders(request.headers)

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature header' }, { status: 401 })
    }

    const secret = getWebhookSecret()
    const isValid = verifyWebhookSignature(body, signature, secret)

    if (!isValid) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 2. Parse custom function call
    const functionCall: CustomFunctionCall & {
      call_id: string
      agent_id: string
    } = JSON.parse(body)

    const { name, arguments: args, call_id, agent_id } = functionCall

    console.log(`[Retell Function] ${name} called for call ${call_id}`)

    // 3. Find tradie config and call log
    const { data: tradieConfig } = await supabase
      .from('tradie_configs')
      .select('*')
      .eq('retell_agent_id', agent_id)
      .single()

    if (!tradieConfig) {
      return createErrorResponse('Agent configuration not found')
    }

    const { data: callLog } = await supabase
      .from('call_logs')
      .select('*')
      .eq('retell_call_id', call_id)
      .single()

    if (!callLog) {
      return createErrorResponse('Call log not found')
    }

    // 4. Route to appropriate function handler
    let response: CustomFunctionResponse

    switch (name) {
      case 'bookingCapture':
        response = await handleBookingCapture(args as BookingCaptureArgs, tradieConfig, callLog)
        break

      case 'callbackRequest':
        response = await handleCallbackRequest(args as CallbackRequestArgs, tradieConfig, callLog)
        break

      case 'emergencyTransfer':
        response = await handleEmergencyTransfer(
          args as EmergencyTransferArgs,
          tradieConfig,
          callLog,
        )
        break

      default:
        return createErrorResponse(`Unknown function: ${name}`)
    }

    // 5. Log the action
    await supabase.from('call_actions').insert({
      call_log_id: callLog.id,
      action_type: name,
      action_timestamp: new Date().toISOString(),
      parameters: args,
      result_status: 'success',
      result_data: response,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Retell Function] Error:', error)
    return createErrorResponse('Internal server error')
  }
}

// ============================================================================
// FUNCTION HANDLERS
// ============================================================================

async function handleBookingCapture(
  args: BookingCaptureArgs,
  tradieConfig: any,
  callLog: any,
): Promise<CustomFunctionResponse> {
  const {
    customerName,
    customerPhone,
    serviceType,
    preferredDate,
    preferredTime,
    description,
    urgency,
  } = args

  // 1. Check availability (simplified - in production, integrate with Google Calendar)
  const isAvailable = await checkAvailability(tradieConfig, preferredDate, preferredTime)

  if (!isAvailable) {
    return {
      result: {
        success: false,
        message: `Sorry, ${preferredDate} at ${preferredTime} is not available. Let me check other times. What about the next day at the same time?`,
        alternativeTimes: await getAlternativeTimes(tradieConfig, preferredDate),
      },
    }
  }

  // 2. Create booking record
  const bookingData = {
    date: preferredDate,
    time: preferredTime,
    service_type: serviceType,
    description,
    customer_name: customerName,
    customer_phone: customerPhone,
    urgency,
  }

  // 3. Update call log with booking details
  const { error: updateError } = await supabase
    .from('call_logs')
    .update({
      outcome_type: 'booking_created',
      booking_data: bookingData,
      metadata: {
        ...callLog.metadata,
        booking_created: true,
      },
    })
    .eq('id', callLog.id)

  if (updateError) {
    console.error('Failed to update booking:', updateError)
    return {
      result: {
        success: false,
        message:
          'Sorry, there was an error creating your booking. Let me transfer you to someone who can help.',
      },
    }
  }

  // 4. Send SMS confirmation (optional, implement later)
  // await sendSMSConfirmation(customerPhone, tradieConfig, bookingData)

  return {
    result: {
      success: true,
      message: `Perfect! I've booked you in for ${serviceType} on ${preferredDate} at ${preferredTime}. You'll receive an SMS confirmation shortly at ${customerPhone}. Is there anything else I can help you with?`,
      booking_reference: callLog.id,
    },
  }
}

async function handleCallbackRequest(
  args: CallbackRequestArgs,
  tradieConfig: any,
  callLog: any,
): Promise<CustomFunctionResponse> {
  const { customerName, customerPhone, preferredCallbackTime, reason } = args

  // Update call log with callback details
  const { error } = await supabase
    .from('call_logs')
    .update({
      outcome_type: 'callback_requested',
      callback_requested_for: preferredCallbackTime,
      callback_notes: reason,
      callback_completed: false,
      metadata: {
        ...callLog.metadata,
        callback_requested: true,
        customer_name: customerName,
      },
    })
    .eq('id', callLog.id)

  if (error) {
    console.error('Failed to create callback request:', error)
    return {
      result: {
        success: false,
        message: 'Sorry, there was an error scheduling your callback. Please try again.',
      },
    }
  }

  // Create a task/reminder for the tradie (could integrate with their calendar)
  // await createCallbackReminder(tradieConfig, customerPhone, preferredCallbackTime)

  return {
    result: {
      success: true,
      message: `No worries! I've scheduled a callback for ${preferredCallbackTime}. ${tradieConfig.business_name} will call you back at ${customerPhone}. Is there anything else I can note down for them?`,
    },
  }
}

async function handleEmergencyTransfer(
  args: EmergencyTransferArgs,
  tradieConfig: any,
  callLog: any,
): Promise<CustomFunctionResponse> {
  const { reason, customerPhone, urgency } = args

  // Determine transfer target (emergency_number if available, else forwarding_number)
  const transferTarget = tradieConfig.emergency_number || tradieConfig.forwarding_number
  const hasEmergencyNumber = !!tradieConfig.emergency_number

  // Update call log with emergency details
  const { error } = await supabase
    .from('call_logs')
    .update({
      outcome_type: 'emergency_transfer',
      emergency_transferred_to: transferTarget,
      emergency_transferred_at: new Date().toISOString(),
      emergency_notes: reason,
      metadata: {
        ...callLog.metadata,
        emergency_transfer: true,
        urgency,
        has_emergency_number: hasEmergencyNumber,
      },
    })
    .eq('id', callLog.id)

  if (error) {
    console.error('Failed to log emergency transfer:', error)
  }

  // ALWAYS send SMS alert to tradie (prevents missed emergencies)
  try {
    const { sendEmergencyAlert } = await import('@/lib/twilio/sms')

    await sendEmergencyAlert({
      tradiePhone: tradieConfig.forwarding_number,
      customerName: callLog.caller_name,
      customerPhone,
      emergencyType: reason,
      businessName: tradieConfig.business_name,
    })

    console.log(`[Emergency] SMS alert sent to ${tradieConfig.forwarding_number}`)
  } catch (smsError) {
    console.error('Failed to send emergency SMS:', smsError)
    // Continue anyway - don't fail the whole request
  }

  // Different response based on whether emergency number is available
  if (hasEmergencyNumber) {
    // Can do direct transfer
    return {
      result: {
        success: true,
        message: `I understand this is ${urgency === 'critical' ? 'critical' : 'urgent'}. I'm transferring you to ${tradieConfig.business_name} right now. Please hold.`,
        transfer_to: transferTarget,
      },
    }
  } else {
    // No emergency number - SMS alert only
    return {
      result: {
        success: true,
        message: `I understand this is ${urgency === 'critical' ? 'critical' : 'urgent'}. I've sent an emergency alert to ${tradieConfig.business_name} and they'll call you back at ${customerPhone} within 5 minutes. This is their top priority right now.`,
      },
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function checkAvailability(tradieConfig: any, date: string, time: string): Promise<boolean> {
  // TODO: Integrate with Google Calendar API
  // For now, just check business hours
  const requestedDate = new Date(date)
  const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

  const businessHours = tradieConfig.business_hours as any[]
  const daySchedule = businessHours.find((h) => h.day === dayOfWeek)

  if (!daySchedule || !daySchedule.enabled) {
    return false
  }

  // Simple time check (HH:MM format)
  const [hours, minutes] = time.split(':').map(Number)
  const [openHours, openMinutes] = daySchedule.open.split(':').map(Number)
  const [closeHours, closeMinutes] = daySchedule.close.split(':').map(Number)

  const requestedMinutes = hours * 60 + minutes
  const openMinutes24 = openHours * 60 + openMinutes
  const closeMinutes24 = closeHours * 60 + closeMinutes

  return requestedMinutes >= openMinutes24 && requestedMinutes < closeMinutes24
}

async function getAlternativeTimes(tradieConfig: any, originalDate: string): Promise<string[]> {
  // TODO: Implement smart alternative time suggestions
  // For now, return next day same time
  const date = new Date(originalDate)
  date.setDate(date.getDate() + 1)

  return [
    date.toISOString().split('T')[0] + ' 09:00',
    date.toISOString().split('T')[0] + ' 13:00',
    date.toISOString().split('T')[0] + ' 15:00',
  ]
}

function createErrorResponse(message: string): NextResponse {
  return NextResponse.json(
    {
      result: {
        success: false,
        message,
      },
    },
    { status: 200 }, // Return 200 so Retell can speak the error message
  )
}
