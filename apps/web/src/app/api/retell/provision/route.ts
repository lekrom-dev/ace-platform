/**
 * Retell + Twilio Provisioning
 * Creates Retell agent + purchases Australian phone via Twilio + configures SIP trunk
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@ace/db'
import { createMasterRetellClient } from '@/lib/retell/client'
import { createTwilioClient } from '@/lib/twilio/client'

// Initialize Supabase with service role key
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface ProvisionRequest {
  customer_id: string
  business_name: string
  trade_type: string
  service_area?: string
  forwarding_number?: string
  greeting_script?: string
  twilio_area_code?: string // e.g., '02' for NSW, '03' for VIC, '07' for QLD
}

export async function POST(request: NextRequest) {
  try {
    const body: ProvisionRequest = await request.json()

    const {
      customer_id,
      business_name,
      trade_type,
      service_area,
      forwarding_number,
      greeting_script,
      twilio_area_code = '02', // Default to NSW
    } = body

    // Validate required fields
    if (!customer_id || !business_name || !trade_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log(`[Provision] Starting for ${business_name}`)

    // 1. Create tradie config record first
    const { data: tradieConfig, error: configError } = await supabase
      .from('tradie_configs')
      .insert({
        customer_id,
        business_name,
        trade_type,
        service_area,
        forwarding_number,
        greeting_script:
          greeting_script ||
          `G'day! Thanks for calling ${business_name}. I'm the AI assistant. How can I help you today?`,
        is_active: false, // Will activate after setup completes
      })
      .select()
      .single()

    if (configError || !tradieConfig) {
      console.error('Failed to create tradie config:', configError)
      return NextResponse.json({ error: 'Failed to create configuration' }, { status: 500 })
    }

    const webhookBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yeahmate.ai'

    // 2. Create Retell Agent
    const retellClient = createMasterRetellClient()

    const agent = await retellClient.createAgent({
      agent_name: `${business_name} - AI Receptionist`,
      llm_websocket_url: `${webhookBaseUrl}/api/retell/llm`,
      voice_id: 'openai-Alloy', // Female voice
      voice_temperature: 1,
      voice_speed: 1,
      responsiveness: 1,
      interruption_sensitivity: 1,
      enable_backchannel: true,
      backchannel_frequency: 0.9,
      backchannel_words: ['hmm', 'uh-huh', 'yeah', 'right', 'ok'],
      language: 'en-AU', // Australian English
      webhook_url: `${webhookBaseUrl}/api/retell/webhook`,
      boosted_keywords: [
        trade_type,
        business_name,
        'booking',
        'appointment',
        'emergency',
        'urgent',
        'quote',
        'estimate',
      ],
    })

    console.log(`[Provision] Created Retell agent ${agent.agent_id}`)

    // 3. Purchase Australian phone number via Twilio
    const twilioClient = createTwilioClient()

    // Search for available AU numbers
    const availableNumbers = await twilioClient.searchAustralianNumbers({
      areaCode: twilio_area_code,
      limit: 1,
    })

    if (!availableNumbers || availableNumbers.length === 0) {
      throw new Error(`No Australian numbers available with area code ${twilio_area_code}`)
    }

    const selectedNumber = availableNumbers[0].phoneNumber

    // Purchase the number
    const purchasedNumber = await twilioClient.purchaseAustralianNumber({
      phoneNumber: selectedNumber,
      friendlyName: `${business_name} - Tradie Receptionist`,
    })

    console.log(`[Provision] Purchased Twilio number ${purchasedNumber.phoneNumber}`)

    // 4. Create SIP Trunk for Retell integration
    const sipTrunk = await twilioClient.createSipTrunk({
      friendlyName: `${business_name} - Retell SIP Trunk`,
      domainName: `${tradieConfig.id}.sip.yeahmate.ai`, // Custom domain per tradie
    })

    console.log(`[Provision] Created SIP trunk ${sipTrunk.sid}`)

    // 5. Assign phone number to SIP trunk
    await twilioClient.assignNumberToTrunk(sipTrunk.sid, purchasedNumber.sid)

    console.log(`[Provision] Assigned number to SIP trunk`)

    // 6. Import phone number to Retell via custom telephony
    // Note: Retell will handle calls via SIP trunk
    const retellPhoneImport = await retellClient.createPhoneNumber({
      phone_number: purchasedNumber.phoneNumber,
      inbound_agent_id: agent.agent_id,
      // Note: Retell SDK may have specific fields for custom telephony import
    })

    console.log(`[Provision] Imported to Retell: ${retellPhoneImport.phone_number_id}`)

    // 7. Update tradie config with all details
    const { error: updateError } = await supabase
      .from('tradie_configs')
      .update({
        retell_agent_id: agent.agent_id,
        retell_phone_id: retellPhoneImport.phone_number_id,
        phone_number: purchasedNumber.phoneNumber,
        is_active: true,
        metadata: {
          twilio_phone_sid: purchasedNumber.sid,
          twilio_trunk_sid: sipTrunk.sid,
          twilio_area_code,
        },
      })
      .eq('id', tradieConfig.id)

    if (updateError) {
      console.error('Failed to update tradie config:', updateError)

      // Cleanup: delete agent, phone number, and SIP trunk
      try {
        await retellClient.deleteAgent(agent.agent_id)
        await retellClient.deletePhoneNumber(retellPhoneImport.phone_number_id)
        await twilioClient.deleteSipTrunk(sipTrunk.sid)
        await twilioClient.releasePhoneNumber(purchasedNumber.sid)
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError)
      }

      return NextResponse.json({ error: 'Failed to complete provisioning' }, { status: 500 })
    }

    // 8. Create interaction record for onboarding
    await supabase.from('interactions').insert({
      customer_id,
      type: 'system',
      channel: 'platform',
      direction: 'outbound',
      status: 'completed',
      outcome: 'success',
      notes: `AI receptionist provisioned: ${purchasedNumber.phoneNumber} (Twilio + Retell)`,
      metadata: {
        agent_id: agent.agent_id,
        phone_number: purchasedNumber.phoneNumber,
        retell_phone_id: retellPhoneImport.phone_number_id,
        twilio_phone_sid: purchasedNumber.sid,
        twilio_trunk_sid: sipTrunk.sid,
      },
    })

    console.log(`[Provision] Completed for ${business_name}`)

    return NextResponse.json({
      success: true,
      tradie_config_id: tradieConfig.id,
      agent_id: agent.agent_id,
      phone_number: purchasedNumber.phoneNumber,
      twilio_phone_sid: purchasedNumber.sid,
      twilio_trunk_sid: sipTrunk.sid,
      retell_phone_id: retellPhoneImport.phone_number_id,
      message: `Successfully provisioned AI receptionist for ${business_name}`,
    })
  } catch (error) {
    console.error('[Provision] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * GET endpoint to check provisioning status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')

    if (!customerId) {
      return NextResponse.json({ error: 'customer_id required' }, { status: 400 })
    }

    const { data: tradieConfig, error } = await supabase
      .from('tradie_configs')
      .select('*')
      .eq('customer_id', customerId)
      .single()

    if (error || !tradieConfig) {
      return NextResponse.json({ provisioned: false }, { status: 404 })
    }

    return NextResponse.json({
      provisioned: true,
      is_active: tradieConfig.is_active,
      phone_number: tradieConfig.phone_number,
      business_name: tradieConfig.business_name,
      agent_id: tradieConfig.retell_agent_id,
      twilio_trunk_sid: tradieConfig.metadata?.twilio_trunk_sid,
    })
  } catch (error) {
    console.error('[Provision] GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
