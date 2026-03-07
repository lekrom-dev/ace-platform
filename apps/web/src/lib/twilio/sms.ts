/**
 * Twilio SMS Service
 * Send alerts and notifications via SMS
 */

import { createTwilioClient } from './client'

export interface EmergencyAlertParams {
  tradiePhone: string
  customerName?: string
  customerPhone: string
  emergencyType: string
  businessName: string
}

export interface BookingConfirmationParams {
  customerPhone: string
  businessName: string
  date: string
  time: string
  serviceType: string
}

/**
 * Send emergency alert SMS to tradie
 */
export async function sendEmergencyAlert(params: EmergencyAlertParams) {
  const { tradiePhone, customerName, customerPhone, emergencyType, businessName } = params

  const twilioClient = createTwilioClient()

  // Format message
  const customerDisplay = customerName || 'A customer'
  const message = `🚨 EMERGENCY CALL - ${businessName}

${customerDisplay} at ${customerPhone} has reported:
${emergencyType}

CALL THEM NOW: ${customerPhone}

This is an urgent situation requiring immediate attention.`

  try {
    // Get the tradie's AI phone number to use as sender
    // In production, you'd query this from tradie_configs
    // For now, we'll use a generic sender (Twilio will use their number)

    const result = await twilioClient.sendSms({
      to: tradiePhone,
      from: process.env.TWILIO_PHONE_NUMBER || tradiePhone, // Fallback to same number
      body: message,
    })

    return {
      success: true,
      messageSid: result.sid,
      to: result.to,
    }
  } catch (error) {
    console.error('Failed to send emergency alert SMS:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send booking confirmation SMS to customer
 */
export async function sendBookingConfirmation(params: BookingConfirmationParams) {
  const { customerPhone, businessName, date, time, serviceType } = params

  const twilioClient = createTwilioClient()

  const message = `✅ Booking Confirmed - ${businessName}

Service: ${serviceType}
Date: ${date}
Time: ${time}

We'll see you then! Reply CANCEL to cancel this booking.`

  try {
    const result = await twilioClient.sendSms({
      to: customerPhone,
      from: process.env.TWILIO_PHONE_NUMBER || customerPhone,
      body: message,
    })

    return {
      success: true,
      messageSid: result.sid,
    }
  } catch (error) {
    console.error('Failed to send booking confirmation SMS:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send callback scheduled SMS to customer
 */
export async function sendCallbackConfirmation(params: {
  customerPhone: string
  businessName: string
  callbackTime: string
}) {
  const { customerPhone, businessName, callbackTime } = params

  const twilioClient = createTwilioClient()

  const message = `📞 Callback Scheduled - ${businessName}

We'll call you back at:
${callbackTime}

Looking forward to speaking with you!`

  try {
    const result = await twilioClient.sendSms({
      to: customerPhone,
      from: process.env.TWILIO_PHONE_NUMBER || customerPhone,
      body: message,
    })

    return {
      success: true,
      messageSid: result.sid,
    }
  } catch (error) {
    console.error('Failed to send callback confirmation SMS:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
