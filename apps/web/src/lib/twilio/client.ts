/**
 * Twilio Client
 * Handles phone number provisioning and SIP trunk configuration for Retell integration
 */

import twilio from 'twilio'

export class TwilioClient {
  private client: ReturnType<typeof twilio>

  constructor(accountSid?: string, authToken?: string) {
    const sid = accountSid || process.env.TWILIO_ACCOUNT_SID
    const token = authToken || process.env.TWILIO_AUTH_TOKEN

    if (!sid || !token) {
      throw new Error('Twilio credentials not configured')
    }

    this.client = twilio(sid, token)
  }

  // ============================================================================
  // PHONE NUMBER MANAGEMENT
  // ============================================================================

  /**
   * Search for available Australian phone numbers
   */
  async searchAustralianNumbers(params: {
    areaCode?: string // e.g., '02' for NSW, '03' for VIC
    contains?: string
    limit?: number
  }) {
    const { areaCode, contains, limit = 10 } = params

    const searchParams: any = {
      limit,
    }

    if (areaCode) {
      searchParams.areaCode = areaCode.replace(/^0+/, '') // Remove leading zeros
    }

    if (contains) {
      searchParams.contains = contains
    }

    const numbers = await this.client.availablePhoneNumbers('AU').local.list(searchParams)

    return numbers
  }

  /**
   * Purchase an Australian phone number
   */
  async purchaseAustralianNumber(params: {
    phoneNumber: string
    friendlyName: string
    voiceUrl?: string // SIP trunk will be configured separately
    smsUrl?: string
  }) {
    const { phoneNumber, friendlyName, voiceUrl, smsUrl } = params

    const incomingNumber = await this.client.incomingPhoneNumbers.create({
      phoneNumber,
      friendlyName,
      voiceUrl: voiceUrl || '', // Will be updated when SIP trunk is configured
      smsUrl: smsUrl || '',
    })

    return incomingNumber
  }

  /**
   * Update phone number configuration
   */
  async updatePhoneNumber(
    phoneNumberSid: string,
    params: {
      friendlyName?: string
      voiceUrl?: string
      smsUrl?: string
      trunkSid?: string // Connect to SIP trunk
    },
  ) {
    const update = await this.client.incomingPhoneNumbers(phoneNumberSid).update(params)

    return update
  }

  /**
   * Release (delete) a phone number
   */
  async releasePhoneNumber(phoneNumberSid: string) {
    await this.client.incomingPhoneNumbers(phoneNumberSid).remove()
  }

  /**
   * Get phone number details
   */
  async getPhoneNumber(phoneNumberSid: string) {
    return this.client.incomingPhoneNumbers(phoneNumberSid).fetch()
  }

  // ============================================================================
  // SIP TRUNK MANAGEMENT (for Retell integration)
  // ============================================================================

  /**
   * Create a SIP trunk for Retell integration
   */
  async createSipTrunk(params: { friendlyName: string; domainName?: string }) {
    const { friendlyName, domainName } = params

    // Create trunk
    const trunk = await this.client.trunking.v1.trunks.create({
      friendlyName,
      domainName,
    })

    // Add Retell's SIP URI as origination endpoint (for inbound calls)
    await this.client.trunking.v1.trunks(trunk.sid).originationUrls.create({
      friendlyName: 'Retell AI Inbound',
      sipUrl: 'sip:sip.retellai.com',
      priority: 1,
      weight: 1,
      enabled: true,
    })

    // Add termination URI (for outbound calls from Retell)
    // Note: Retell will provide specific credentials if needed
    await this.client.trunking.v1.trunks(trunk.sid).credentialLists

    return trunk
  }

  /**
   * Assign phone number to SIP trunk
   */
  async assignNumberToTrunk(trunkSid: string, phoneNumberSid: string) {
    await this.client.trunking.v1.trunks(trunkSid).phoneNumbers.create({
      phoneNumberSid,
    })
  }

  /**
   * Get SIP trunk details
   */
  async getSipTrunk(trunkSid: string) {
    return this.client.trunking.v1.trunks(trunkSid).fetch()
  }

  /**
   * Delete SIP trunk
   */
  async deleteSipTrunk(trunkSid: string) {
    await this.client.trunking.v1.trunks(trunkSid).remove()
  }

  // ============================================================================
  // SMS MANAGEMENT
  // ============================================================================

  /**
   * Send SMS notification
   */
  async sendSms(params: { to: string; from: string; body: string }) {
    const { to, from, body } = params

    const message = await this.client.messages.create({
      to,
      from,
      body,
    })

    return message
  }
}

/**
 * Create Twilio client instance
 */
export function createTwilioClient(): TwilioClient {
  return new TwilioClient()
}

/**
 * Validate Twilio credentials are configured
 */
export function validateTwilioConfig(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
}
