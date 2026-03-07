/**
 * Retell Webhook Utilities
 * Handles webhook signature verification for security
 */

import crypto from 'crypto'

/**
 * Verify Retell webhook signature
 * @param payload - Raw request body as string
 * @param signature - X-Retell-Signature header value
 * @param secret - Webhook signing secret from Retell dashboard
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    // Retell uses HMAC-SHA256 for signature verification
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const expectedSignature = hmac.digest('hex')

    // Debug logging
    console.log('[Webhook Debug] Signature verification:', {
      receivedSignature: signature,
      receivedLength: signature.length,
      expectedSignature: expectedSignature,
      expectedLength: expectedSignature.length,
      secretLength: secret.length,
      payloadLength: payload.length,
    })

    // Use constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    )

    console.log('[Webhook Debug] Signature valid:', isValid)
    return isValid
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return false
  }
}

/**
 * Extract signature from request headers
 */
export function getSignatureFromHeaders(headers: Headers): string | null {
  return headers.get('x-retell-signature') || headers.get('X-Retell-Signature')
}

/**
 * Get webhook signing secret from environment
 */
export function getWebhookSecret(): string {
  const secret = process.env.RETELL_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('RETELL_WEBHOOK_SECRET environment variable is not set')
  }
  return secret
}
