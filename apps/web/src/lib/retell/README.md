# Retell AI Integration - Module 3: Tradie Receptionist

This directory contains the Retell AI integration for the Tradie Receptionist module. Retell provides voice AI capabilities for handling inbound calls to Australian tradies 24/7.

## Architecture

### Multi-Workspace Approach
Each tradie gets their own isolated Retell workspace with:
- Dedicated billing
- Separate phone numbers
- Independent AI agents
- Isolated analytics

This provides better organization, simplified cost tracking, and scalability.

## Files

### Core Library (`/lib/retell/`)
- **`types.ts`** - TypeScript types for Retell API, webhooks, and custom functions
- **`client.ts`** - Retell API client for agent, phone number, and call management
- **`webhook.ts`** - Webhook signature verification utilities
- **`index.ts`** - Barrel exports

### API Routes (`/app/api/retell/`)
- **`webhook/route.ts`** - Receives Retell events (call_started, call_ended, call_analyzed)
- **`functions/route.ts`** - Handles custom function calls during conversations
- **`provision/route.ts`** - Provisions new Retell workspace for onboarding tradies

## Custom Functions

Three custom functions are available during calls:

### 1. `bookingCapture`
Captures booking details and creates appointments.

**Arguments:**
- `customerName`: string
- `customerPhone`: string
- `serviceType`: string (e.g., "plumbing repair")
- `preferredDate`: ISO 8601 date
- `preferredTime`: HH:MM format
- `description`: string
- `urgency`: "routine" | "urgent" | "emergency"

**Returns:**
- Success/failure status
- Confirmation message
- Booking reference

### 2. `callbackRequest`
Schedules a callback for the customer.

**Arguments:**
- `customerName`: string
- `customerPhone`: string
- `preferredCallbackTime`: ISO 8601 datetime
- `reason`: string

**Returns:**
- Success/failure status
- Confirmation message

### 3. `emergencyTransfer`
Transfers urgent calls to the tradie's forwarding number.

**Arguments:**
- `reason`: string
- `customerPhone`: string
- `urgency`: "high" | "critical"

**Returns:**
- Success/failure status
- Transfer message
- Forwarding number

## Webhook Events

### `call_started`
Triggered when a call begins. Creates a call_log record with "in_progress" status.

### `call_ended`
Triggered when a call ends. Updates call_log with:
- Call transcript
- Duration
- Recording URL
- Outcome type
- Metadata

### `call_analyzed`
Triggered after Retell analyzes the call. Adds:
- Call summary
- Sentiment analysis
- Success indicators
- Voicemail detection

## Database Schema

### `tradie_configs`
Stores configuration for each tradie:
- Business details (name, trade type, service area)
- Retell credentials (workspace_id, api_key, agent_id, phone_id)
- Phone numbers (Twilio number, forwarding number)
- Business hours (JSON schedule)
- Google Calendar integration
- Booking configuration

### `call_logs`
Logs all calls with:
- Call details (start time, end time, duration)
- Caller information
- Transcript and recording
- Outcome type
- Booking/callback/emergency details

### `call_actions`
Tracks individual actions during calls:
- Action type (booking_capture, callback_request, emergency_transfer)
- Parameters
- Results
- Error handling

## Environment Variables

```bash
# Retell AI Master API Key (for workspace/agent creation)
RETELL_API_KEY=your_retell_api_key

# Webhook signing secret from Retell dashboard
RETELL_WEBHOOK_SECRET=your_webhook_secret

# Your app URL (for webhook callbacks)
NEXT_PUBLIC_APP_URL=https://yeahmate.ai
```

## Setup Instructions

### 1. Get Retell API Key
1. Sign up at https://retellai.com
2. Go to Dashboard → Settings → API Keys
3. Create a new API key and copy it

### 2. Set Webhook Secret
1. In Retell Dashboard → Webhooks
2. Add webhook URL: `https://yeahmate.ai/api/retell/webhook`
3. Copy the signing secret

### 3. Configure Environment Variables
Add to `.env.local`:
```bash
RETELL_API_KEY=sk_...
RETELL_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://yeahmate.ai
```

### 4. Provision a Tradie
Call the provisioning API:
```bash
POST /api/retell/provision
{
  "customer_id": "uuid",
  "business_name": "Smith Plumbing",
  "trade_type": "plumber",
  "service_area": "Sydney Northern Beaches",
  "forwarding_number": "+61412345678",
  "australian_area_code": 2
}
```

This will:
- Create a tradie_config record
- Create a Retell agent
- Purchase an Australian phone number
- Configure webhooks
- Activate the AI receptionist

## Voice Configuration

### Voice Selection
Currently using `openai-Alloy` (female, neutral accent).

For Australian accent, consider:
- `openai-Nova` (more conversational)
- Custom voice training with Australian samples

### Greeting Script
Default: "G'day! Thanks for calling [Business Name]. I'm the AI assistant. How can I help you today?"

Customize per tradie in `tradie_configs.greeting_script`.

### Backchannel Words
Using: "hmm", "uh-huh", "yeah", "right", "ok"

## Integration Roadmap

### Phase 1 (Current) - MVP
- [x] Webhook handlers (call events)
- [x] Custom functions (booking, callback, transfer)
- [x] Database schema
- [x] Provisioning API
- [ ] Apply migration to Supabase
- [ ] Test with real Retell account

### Phase 2 - Enhanced Features
- [ ] Google Calendar integration (real availability checking)
- [ ] SMS confirmations via Twilio
- [ ] Real-time dashboard for call monitoring
- [ ] Call analytics and reporting
- [ ] Custom LLM integration (via websocket)

### Phase 3 - Advanced
- [ ] Multi-language support
- [ ] Voice training for Australian accents
- [ ] Sentiment analysis
- [ ] Follow-up automation
- [ ] Integration with existing CRM/booking systems

## Testing

### Test Webhook Signature Verification
```typescript
import { verifyWebhookSignature } from '@/lib/retell/webhook'

const payload = '{"event":"call_started",...}'
const signature = 'abc123...'
const secret = 'whsec_...'

const isValid = verifyWebhookSignature(payload, signature, secret)
```

### Test Custom Function
```bash
curl -X POST https://yeahmate.ai/api/retell/functions \
  -H "Content-Type: application/json" \
  -H "X-Retell-Signature: ..." \
  -d '{
    "name": "bookingCapture",
    "arguments": {
      "customerName": "John Smith",
      "customerPhone": "+61412345678",
      "serviceType": "Leak repair",
      "preferredDate": "2026-03-15",
      "preferredTime": "10:00",
      "description": "Kitchen sink leaking",
      "urgency": "routine"
    },
    "call_id": "call_abc123",
    "agent_id": "agent_xyz789"
  }'
```

## Troubleshooting

### Webhook Signature Invalid
- Verify `RETELL_WEBHOOK_SECRET` matches Retell dashboard
- Check webhook payload is passed as raw body (not parsed JSON)
- Ensure using `crypto.timingSafeEqual` for comparison

### Agent Not Found
- Verify `retell_agent_id` is stored in `tradie_configs`
- Check agent exists in Retell dashboard
- Confirm webhook is calling correct environment (prod vs staging)

### Phone Number Purchase Failed
- Check area_code is valid Australian code (2, 3, 7, 8)
- Verify Retell account has sufficient credit
- Check Twilio integration is enabled

## Cost Structure

### Retell Pricing (as of 2026)
- Inbound calls: ~$0.05/min
- Phone number: ~$2/month per number
- No charge for multiple workspaces

### Estimated Costs per Tradie
- 100 calls/month × 3 min avg = 300 min
- 300 min × $0.05 = $15/month
- Phone number = $2/month
- **Total: ~$17/month per tradie**

### Module Pricing
- Starter: $99/month (covers ~5-6x cost)
- Professional: $139/month
- Premium: $179/month

## Support

For issues with Retell integration:
1. Check Retell documentation: https://docs.retellai.com
2. Review call logs in Supabase: `call_logs` table
3. Check webhook delivery in Retell dashboard
4. Review Vercel logs for API errors

## Domain

**yeahmate.ai** - Primary domain for Module 3 Tradie Receptionist
- Landing page: https://yeahmate.ai
- App: https://app.yeahmate.ai (TBD)
- Webhooks: https://yeahmate.ai/api/retell/*
