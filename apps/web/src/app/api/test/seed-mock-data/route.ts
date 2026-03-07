/**
 * Seed Mock Data for Tradie Receptionist Dashboard
 * Creates fake call logs, bookings, and callbacks
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@ace/db'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: NextRequest) {
  try {
    // Get test customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', 'test-tradie@yeahmate.ai')
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Test customer not found' }, { status: 404 })
    }

    // Get or create tradie config
    let { data: tradieConfig } = await supabase
      .from('tradie_configs')
      .select('id')
      .eq('customer_id', customer.id)
      .single()

    if (!tradieConfig) {
      const { data: newConfig } = await supabase
        .from('tradie_configs')
        .insert({
          customer_id: customer.id,
          business_name: 'Test Plumbing Co',
          trade_type: 'plumber',
          service_area: 'Sydney Northern Beaches',
          phone_number: '+61 2 1234 5678',
          forwarding_number: '+61 412 345 678',
          is_active: true,
        })
        .select()
        .single()

      tradieConfig = newConfig!
    }

    // Clear existing mock data
    await supabase.from('call_logs').delete().eq('customer_id', customer.id)

    // Create mock calls
    const mockCalls = [
      // Booking - Today
      {
        customer_id: customer.id,
        tradie_config_id: tradieConfig.id,
        retell_call_id: 'mock_call_1',
        call_status: 'completed',
        caller_phone: '+61 412 111 111',
        caller_name: 'Sarah Johnson',
        call_started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        call_ended_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
        duration_seconds: 180,
        transcript:
          "Agent: G'day! Thanks for calling Test Plumbing Co. I'm the AI assistant. How can I help you today?\n\nCaller: Hi, I need to book a plumber. My kitchen sink is leaking.\n\nAgent: No worries, I can help you with that. Can I get your name please?\n\nCaller: It's Sarah Johnson.\n\nAgent: Thanks Sarah. And what's the best number to reach you on?\n\nCaller: 0412 111 111.\n\nAgent: Perfect. When would you like us to come out?\n\nCaller: Tomorrow morning if possible, around 10am?\n\nAgent: Let me check... Yes, I can book you in for tomorrow at 10am. That's March 3rd. Can you describe the issue for me?\n\nCaller: The kitchen sink tap is dripping constantly and there's a small leak under the sink.\n\nAgent: Got it. I've booked you in for tomorrow, March 3rd at 10am for a kitchen sink leak repair. You'll receive an SMS confirmation shortly. Is there anything else I can help you with?\n\nCaller: No, that's all. Thanks!\n\nAgent: You're welcome! We'll see you tomorrow at 10am.",
        summary: 'Customer booked appointment for kitchen sink leak repair',
        sentiment: 'Positive',
        outcome_type: 'booking_created',
        booking_data: {
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: '10:00',
          service_type: 'Kitchen sink leak repair',
          description: 'Kitchen sink tap dripping constantly with leak under sink',
          customer_name: 'Sarah Johnson',
          customer_phone: '+61 412 111 111',
          urgency: 'routine',
        },
      },
      // Booking - Next week
      {
        customer_id: customer.id,
        tradie_config_id: tradieConfig.id,
        retell_call_id: 'mock_call_2',
        call_status: 'completed',
        caller_phone: '+61 412 222 222',
        caller_name: 'Mike Chen',
        call_started_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        call_ended_at: new Date(Date.now() - 24 * 60 * 60 * 1000 + 4 * 60 * 1000).toISOString(),
        duration_seconds: 240,
        transcript:
          "Agent: G'day! Thanks for calling Test Plumbing Co. I'm the AI assistant. How can I help you today?\n\nCaller: I need to install a new hot water system.\n\nAgent: Sure, I can help book that in. What's your name?\n\nCaller: Mike Chen.\n\nAgent: Thanks Mike. And your contact number?\n\nCaller: 0412 222 222.\n\nAgent: Perfect. This is a bigger job - when would suit you?\n\nCaller: Next Monday would be great, in the afternoon?\n\nAgent: Let me see... I can book you for Monday March 10th at 2pm. Does that work?\n\nCaller: Perfect!\n\nAgent: Excellent. I've got you down for a hot water system installation on Monday March 10th at 2pm. We'll send you a confirmation SMS.",
        summary: 'Booked hot water system installation',
        sentiment: 'Positive',
        outcome_type: 'booking_created',
        booking_data: {
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: '14:00',
          service_type: 'Hot water system installation',
          description: 'Install new hot water system',
          customer_name: 'Mike Chen',
          customer_phone: '+61 412 222 222',
          urgency: 'routine',
        },
      },
      // Callback Request
      {
        customer_id: customer.id,
        tradie_config_id: tradieConfig.id,
        retell_call_id: 'mock_call_3',
        call_status: 'completed',
        caller_phone: '+61 412 333 333',
        caller_name: 'David Williams',
        call_started_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        call_ended_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString(),
        duration_seconds: 120,
        transcript:
          "Agent: G'day! Thanks for calling Test Plumbing Co. I'm the AI assistant. How can I help you today?\n\nCaller: I need a quote for bathroom renovation.\n\nAgent: I can have someone call you back to discuss that. What's your name?\n\nCaller: David Williams.\n\nAgent: And your number?\n\nCaller: 0412 333 333.\n\nAgent: When's a good time to call you back?\n\nCaller: This afternoon around 3pm would be great.\n\nAgent: Perfect, I've scheduled a callback for today at 3pm. One of our team will call you to discuss your bathroom renovation quote.",
        summary: 'Requested callback for bathroom renovation quote',
        sentiment: 'Neutral',
        outcome_type: 'callback_requested',
        callback_requested_for: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        callback_notes: 'Customer wants quote for bathroom renovation',
        callback_completed: false,
      },
      // Emergency
      {
        customer_id: customer.id,
        tradie_config_id: tradieConfig.id,
        retell_call_id: 'mock_call_4',
        call_status: 'completed',
        caller_phone: '+61 412 444 444',
        caller_name: 'Emma Brown',
        call_started_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        call_ended_at: new Date(Date.now() - 5 * 60 * 60 * 1000 + 1 * 60 * 1000).toISOString(),
        duration_seconds: 60,
        transcript:
          "Agent: G'day! Thanks for calling Test Plumbing Co. I'm the AI assistant. How can I help you today?\n\nCaller: This is an emergency! My hot water system is flooding the laundry!\n\nAgent: I understand this is urgent. I'm transferring you to our emergency line right now. Please hold.",
        summary: 'Emergency - hot water system flooding',
        sentiment: 'Negative',
        outcome_type: 'emergency_transfer',
        emergency_transferred_to: '+61 412 345 678',
        emergency_transferred_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        emergency_notes: 'Hot water system flooding laundry',
      },
      // Information only
      {
        customer_id: customer.id,
        tradie_config_id: tradieConfig.id,
        retell_call_id: 'mock_call_5',
        call_status: 'completed',
        caller_phone: '+61 412 555 555',
        caller_name: null,
        call_started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        call_ended_at: new Date(Date.now() - 6 * 60 * 60 * 1000 + 1 * 60 * 1000).toISOString(),
        duration_seconds: 60,
        transcript:
          "Agent: G'day! Thanks for calling Test Plumbing Co. I'm the AI assistant. How can I help you today?\n\nCaller: What are your business hours?\n\nAgent: We're open Monday to Friday 7am to 5pm, and Saturday 8am to 12pm. We're closed on Sundays.\n\nCaller: Thanks!\n\nAgent: You're welcome! Is there anything else I can help with today?\n\nCaller: No, that's all.",
        summary: 'Customer asked about business hours',
        sentiment: 'Neutral',
        outcome_type: 'information_only',
      },
      // Another booking - urgent
      {
        customer_id: customer.id,
        tradie_config_id: tradieConfig.id,
        retell_call_id: 'mock_call_6',
        call_status: 'completed',
        caller_phone: '+61 412 666 666',
        caller_name: 'Lisa Taylor',
        call_started_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        call_ended_at: new Date(Date.now() - 12 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
        duration_seconds: 180,
        transcript:
          "Agent: G'day! Thanks for calling Test Plumbing Co. I'm the AI assistant. How can I help you today?\n\nCaller: My toilet is blocked and overflowing. I need someone urgently!\n\nAgent: I understand this is urgent. Let me book you in as soon as possible. What's your name?\n\nCaller: Lisa Taylor.\n\nAgent: And your number?\n\nCaller: 0412 666 666.\n\nAgent: I can get someone out to you today at 4pm. Does that work?\n\nCaller: Yes please!\n\nAgent: Perfect. I've booked an urgent appointment for today at 4pm for your blocked toilet. You'll get an SMS confirmation.",
        summary: 'Urgent booking for blocked toilet',
        sentiment: 'Neutral',
        outcome_type: 'booking_created',
        booking_data: {
          date: new Date().toISOString().split('T')[0],
          time: '16:00',
          service_type: 'Blocked toilet repair',
          description: 'Toilet blocked and overflowing - urgent',
          customer_name: 'Lisa Taylor',
          customer_phone: '+61 412 666 666',
          urgency: 'urgent',
        },
      },
    ]

    // Insert all mock calls
    const { data: insertedCalls, error: insertError } = await supabase
      .from('call_logs')
      .insert(mockCalls)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create mock calls', details: insertError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Created ${mockCalls.length} mock calls`,
      calls_created: insertedCalls?.length || 0,
      customer_id: customer.id,
      tradie_config_id: tradieConfig.id,
    })
  } catch (error: any) {
    console.error('[Seed Mock Data] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 },
    )
  }
}
