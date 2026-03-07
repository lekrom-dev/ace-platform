import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Twilio from 'twilio'

/**
 * Cron Job: Send Referral Invitations
 *
 * Runs every hour to send scheduled SMS invitations
 * Also schedules follow-up calls 24 hours after SMS
 *
 * Set up in Vercel:
 * - Add Vercel Cron: 0 * * * * (every hour)
 * - Or use external cron to hit this endpoint
 */

// Use service role key for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const twilioClient = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (security)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending invitations
    const { data: invitations, error: fetchError } = await supabase.rpc(
      'get_pending_referral_invitations',
    )

    if (fetchError) {
      console.error('Error fetching pending invitations:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    if (!invitations || invitations.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: 'No pending invitations',
      })
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Send SMS for each invitation
    for (const invite of invitations) {
      try {
        // Send SMS via Twilio
        const message = await twilioClient.messages.create({
          to: invite.phone_number,
          from: process.env.TWILIO_PHONE_NUMBER!,
          body: invite.sms_message,
        })

        // Calculate follow-up call time (24 hours from now)
        const followUpTime = new Date()
        followUpTime.setHours(followUpTime.getHours() + 24)

        // Update invitation status
        await supabase
          .from('referral_invitations')
          .update({
            status: 'sms_sent',
            sms_sent_at: new Date().toISOString(),
            sms_sid: message.sid,
            scheduled_call_at: followUpTime.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', invite.invitation_id)

        results.sent++

        console.log(`✅ SMS sent to ${invite.phone_number} (${invite.customer_name})`)
      } catch (error: any) {
        console.error(`❌ Failed to send SMS to ${invite.phone_number}:`, error)

        // Mark as failed
        await supabase
          .from('referral_invitations')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invite.invitation_id)

        results.failed++
        results.errors.push(`${invite.phone_number}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      total: invitations.length,
      message: `Sent ${results.sent}/${invitations.length} invitations`,
    })
  } catch (error: any) {
    console.error('Error in send-referral-invites cron:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    )
  }
}

// Allow GET for testing (remove in production)
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  return POST(request)
}
