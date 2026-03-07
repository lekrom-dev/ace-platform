import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API Route: Provision AI Receptionist
 *
 * Creates Retell AI agent and provisions phone number
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * Search and purchase a Twilio phone number in the customer's location
 */
async function purchaseTwilioNumber(
  country: string,
  state?: string,
  city?: string,
): Promise<string> {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID!
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN!
  const twilioAuth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')

  // Map country codes to Twilio country codes
  const countryMap: Record<string, string> = {
    AU: 'AU', // Australia
    US: 'US', // United States
    GB: 'GB', // United Kingdom
    NZ: 'NZ', // New Zealand
    CA: 'CA', // Canada
  }

  const twilioCountry = countryMap[country] || 'AU'

  // Build search parameters
  const searchParams = new URLSearchParams({
    VoiceEnabled: 'true',
    SmsEnabled: 'true',
  })

  // Add location filters for more specific search
  if (state) {
    searchParams.append('InRegion', state)
  }
  if (city) {
    searchParams.append('InLocality', city)
  }

  // Search for available numbers
  const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/AvailablePhoneNumbers/${twilioCountry}/Local.json?${searchParams.toString()}`

  const searchResponse = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${twilioAuth}`,
    },
  })

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text()
    console.error('Twilio number search failed:', {
      status: searchResponse.status,
      statusText: searchResponse.statusText,
      body: errorText,
      country: twilioCountry,
      searchUrl,
    })
    throw new Error(`Failed to search for phone numbers: ${searchResponse.status} - ${errorText}`)
  }

  const searchData = await searchResponse.json()
  console.log(`Twilio search results for ${twilioCountry}:`, {
    count: searchData.available_phone_numbers?.length || 0,
    country: twilioCountry,
    state,
    city,
  })

  if (!searchData.available_phone_numbers || searchData.available_phone_numbers.length === 0) {
    // Fallback 1: try without location filters
    console.log('No numbers found with location filters, trying without filters...')
    const fallbackUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/AvailablePhoneNumbers/${twilioCountry}/Local.json?VoiceEnabled=true&SmsEnabled=true`

    const fallbackResponse = await fetch(fallbackUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${twilioAuth}`,
      },
    })

    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json()
      console.log(`Twilio Local fallback results:`, {
        count: fallbackData.available_phone_numbers?.length || 0,
      })
      if (fallbackData.available_phone_numbers?.length > 0) {
        searchData.available_phone_numbers = fallbackData.available_phone_numbers
      }
    }

    // Fallback 2: try Mobile numbers (more readily available in AU)
    if (!searchData.available_phone_numbers || searchData.available_phone_numbers.length === 0) {
      console.log('No Local numbers found, trying Mobile numbers...')
      const mobileUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/AvailablePhoneNumbers/${twilioCountry}/Mobile.json?VoiceEnabled=true&SmsEnabled=true`

      const mobileResponse = await fetch(mobileUrl, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${twilioAuth}`,
        },
      })

      if (mobileResponse.ok) {
        const mobileData = await mobileResponse.json()
        console.log(`Twilio Mobile results:`, {
          count: mobileData.available_phone_numbers?.length || 0,
        })
        if (mobileData.available_phone_numbers?.length > 0) {
          searchData.available_phone_numbers = mobileData.available_phone_numbers
        }
      }
    }

    // If still no numbers found, throw error
    if (!searchData.available_phone_numbers || searchData.available_phone_numbers.length === 0) {
      console.error('No phone numbers available at all for country:', twilioCountry)
      throw new Error(
        `No phone numbers available in ${twilioCountry}. Please check:\n\n` +
          `1. Go to Twilio Console: https://console.twilio.com/us1/develop/phone-numbers/manage/search\n` +
          `2. Can you see available numbers for Australia?\n` +
          `3. If yes, you may need to complete regulatory requirements:\n` +
          `   - Go to: https://console.twilio.com/us1/develop/phone-numbers/regulatory-compliance\n` +
          `   - Complete any pending bundles\n` +
          `4. Contact Twilio support to enable Australian numbers for your account\n\n` +
          `For help: https://www.twilio.com/docs/phone-numbers/regulatory/getting-started`,
      )
    }
  }

  // Get the first available number
  const availableNumber = searchData.available_phone_numbers[0].phone_number

  console.log(`Found available number: ${availableNumber}`)

  // Purchase the number
  // Note: VoiceUrl/SmsUrl will be configured by Retell AI when we register the number
  const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`

  const purchaseResponse = await fetch(purchaseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${twilioAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      PhoneNumber: availableNumber,
      // FriendlyName helps identify this number in Twilio console
      FriendlyName: 'AI Receptionist - Retell',
    }).toString(),
  })

  if (!purchaseResponse.ok) {
    const errorText = await purchaseResponse.text()
    console.error('Twilio number purchase failed:', {
      status: purchaseResponse.status,
      statusText: purchaseResponse.statusText,
      body: errorText,
      phoneNumber: availableNumber,
    })

    // Parse Twilio error for better user message
    let errorMessage = errorText
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.message || errorJson.error || errorText
    } catch {
      // If not JSON, use raw text
    }

    throw new Error(`Failed to purchase phone number: ${errorMessage}`)
  }

  const purchaseData = await purchaseResponse.json()
  console.log(`Successfully purchased number: ${purchaseData.phone_number}`)

  return purchaseData.phone_number
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get customer with location
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, name, business_name, country, state, city')
      .eq('auth_user_id', user.id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check if already provisioned
    const { data: existing } = await supabaseAdmin
      .from('tradie_configs')
      .select('phone_number')
      .eq('customer_id', customer.id)
      .single()

    if (existing?.phone_number) {
      return NextResponse.json({ error: 'AI receptionist already provisioned' }, { status: 400 })
    }

    // 1. First create a Retell LLM with the prompt
    const llmResponse = await fetch('https://api.retellai.com/create-retell-llm', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        general_prompt: `You are a friendly and professional AI receptionist for ${customer.business_name || customer.name}, a tradie business in Australia.

Your role is to:
- Answer calls professionally and warmly
- Take messages and booking requests
- Provide business hours: Monday-Friday 7am-5pm, Saturday 8am-12pm
- Handle emergency calls (flooding, no power, etc.) with urgency
- Be conversational and helpful

Always speak in a friendly Australian tone. If it's an emergency, prioritize getting their contact details and the nature of the emergency.`,
        begin_message: `G'day! You've reached ${customer.business_name || customer.name}. How can I help you today?`,
        model: 'gpt-4o',
      }),
    })

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text()
      console.error('Retell LLM creation failed:', {
        status: llmResponse.status,
        body: errorText,
      })
      return NextResponse.json(
        { error: `Failed to create LLM: ${llmResponse.status}` },
        { status: 500 },
      )
    }

    const llmData = await llmResponse.json()
    const llmId = llmData.llm_id

    // 2. Create Retell AI Agent using the LLM
    const agentResponse = await fetch('https://api.retellai.com/create-agent', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_name: `${customer.business_name || customer.name} - AI Receptionist`,
        voice_id: '11labs-Adrian',
        language: 'en-AU',
        response_engine: {
          type: 'retell-llm',
          llm_id: llmId,
        },
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/retell/webhook`,
        enable_backchannel: true,
        interruption_sensitivity: 0.5,
      }),
    })

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text()
      console.error('Retell agent creation failed:', {
        status: agentResponse.status,
        statusText: agentResponse.statusText,
        body: errorText,
        headers: Object.fromEntries(agentResponse.headers.entries()),
      })
      return NextResponse.json(
        { error: `Failed to create AI agent: ${agentResponse.status} ${errorText}` },
        { status: 500 },
      )
    }

    const agentData = await agentResponse.json()
    const agentId = agentData.agent_id

    // 3. Purchase Twilio number in customer's location
    let purchasedNumber: string
    try {
      purchasedNumber = await purchaseTwilioNumber(
        customer.country || 'AU',
        customer.state,
        customer.city,
      )
      console.log(`Purchased Twilio number for ${customer.business_name}: ${purchasedNumber}`)
    } catch (purchaseError: any) {
      console.error('Failed to purchase Twilio number:', purchaseError)

      // Clean up the agent
      await fetch(`https://api.retellai.com/delete-agent/${agentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
        },
      }).catch(() => {})

      return NextResponse.json(
        { error: `Failed to purchase phone number: ${purchaseError.message}` },
        { status: 500 },
      )
    }

    // 4. Register purchased phone number with Retell AI
    const phoneResponse = await fetch('https://api.retellai.com/create-phone-number', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_number: purchasedNumber,
        agent_id: agentId,
        twilio_account_sid: process.env.TWILIO_ACCOUNT_SID,
        twilio_auth_token: process.env.TWILIO_AUTH_TOKEN,
      }),
    })

    if (!phoneResponse.ok) {
      const errorText = await phoneResponse.text()
      console.error('Retell phone provisioning failed:', {
        status: phoneResponse.status,
        statusText: phoneResponse.statusText,
        body: errorText,
      })

      // Try to clean up the agent
      await fetch(`https://api.retellai.com/delete-agent/${agentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
        },
      }).catch(() => {})

      return NextResponse.json(
        { error: `Failed to provision phone number: ${phoneResponse.status} ${errorText}` },
        { status: 500 },
      )
    }

    const phoneData = await phoneResponse.json()
    const phoneNumber = phoneData.phone_number || purchasedNumber

    // 5. Save to database
    const { error: saveError } = await supabaseAdmin.from('tradie_configs').upsert({
      customer_id: customer.id,
      business_name: customer.business_name || customer.name,
      phone_number: phoneNumber,
      retell_agent_id: agentId,
      retell_phone_number_id: phoneData.phone_number_id,
      is_active: true,
      business_hours: {
        monday: { open: '07:00', close: '17:00', enabled: true },
        tuesday: { open: '07:00', close: '17:00', enabled: true },
        wednesday: { open: '07:00', close: '17:00', enabled: true },
        thursday: { open: '07:00', close: '17:00', enabled: true },
        friday: { open: '07:00', close: '17:00', enabled: true },
        saturday: { open: '08:00', close: '12:00', enabled: true },
        sunday: { open: null, close: null, enabled: false },
      },
      emergency_handling: {
        enabled: true,
        notify_via_sms: true,
      },
    })

    if (saveError) {
      console.error('Failed to save config:', saveError)
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      phoneNumber,
      agentId,
    })
  } catch (error: any) {
    console.error('Error provisioning receptionist:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 },
    )
  }
}
