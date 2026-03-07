# Retell Integration Test Guide

## Prerequisites Checklist

- [ ] Signed up for Retell AI account
- [ ] Got API Key from Retell Dashboard
- [ ] Got Webhook Secret from Retell Dashboard
- [ ] Added credentials to `.env.local`

## Step 1: Get Your Retell Credentials

### Get API Key

1. Go to https://app.retellai.com (or wherever Retell sends you after signup)
2. Navigate to **Settings** → **API Keys**
3. Click **"Create New API Key"**
4. Copy the key (starts with `sk_`)
5. **IMPORTANT:** Save it now - you won't be able to see it again!

### Get Webhook Secret

1. In Retell Dashboard, go to **Webhooks** or **Settings** → **Webhooks**
2. Click **"Add Webhook"** or **"Create Webhook"**
3. Enter your webhook URL:
   - **Local testing:** `http://localhost:3000/api/retell/webhook`
   - **Production:** `https://your-domain.vercel.app/api/retell/webhook`
4. Select events to listen for:
   - ✅ `call_started`
   - ✅ `call_ended`
   - ✅ `call_analyzed`
5. Copy the **Signing Secret** (starts with `whsec_`)

## Step 2: Add Credentials to Environment

Add these lines to `/Users/cmorkel/ace-platform/apps/web/.env.local`:

```bash
# Retell AI (Module 3 - Tradie Receptionist)
RETELL_API_KEY=sk_your_actual_key_here
RETELL_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

Make sure to also update `NEXT_PUBLIC_APP_URL` if testing locally:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Restart Dev Server

```bash
cd /Users/cmorkel/ace-platform
npm run dev
```

## Step 4: Test API Connectivity

Open in browser or curl:
```bash
curl http://localhost:3000/api/retell/test
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Retell API credentials are valid!",
  "config": {
    "api_key_configured": true,
    "webhook_secret_configured": true,
    "webhook_url": "http://localhost:3000/api/retell/webhook",
    "functions_url": "http://localhost:3000/api/retell/functions",
    "provision_url": "http://localhost:3000/api/retell/provision"
  }
}
```

**Possible Errors:**
- `RETELL_API_KEY not configured` - Add the API key to .env.local
- `API key invalid` - Check you copied the full key correctly
- `RETELL_WEBHOOK_SECRET not configured` - Add the webhook secret

## Step 5: Create a Test Customer

Go to your Supabase dashboard:
1. Navigate to **Table Editor** → **customers**
2. Click **Insert row**
3. Add:
   - `auth_user_id`: (copy from auth.users table or create new user)
   - `email`: `test@example.com`
   - `full_name`: `Test Tradie`
   - `subscription_status`: `active`
4. Note the `id` (UUID) - you'll need this next

## Step 6: Provision Test Tradie

Run the provisioning API:

```bash
curl -X POST http://localhost:3000/api/retell/provision \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "your-customer-uuid-here",
    "business_name": "Test Plumbing Co",
    "trade_type": "plumber",
    "service_area": "Sydney Northern Beaches",
    "forwarding_number": "+61412345678",
    "australian_area_code": 2
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "tradie_config_id": "uuid",
  "agent_id": "agent_xxxx",
  "phone_number": "+61 2 1234 5678",
  "phone_number_id": "phone_xxxx",
  "message": "Successfully provisioned AI receptionist for Test Plumbing Co"
}
```

**What This Does:**
1. Creates a record in `tradie_configs` table
2. Creates a Retell agent with Australian voice settings
3. Purchases an Australian phone number (area code 2 = NSW)
4. Links the phone number to the agent
5. Configures webhooks to your app

## Step 7: Make a Test Call

**Option A: Call the Phone Number**
1. Use your mobile phone
2. Call the number returned from provisioning: `+61 2 1234 5678`
3. Talk to the AI receptionist
4. Try booking an appointment:
   - "Hi, I need to book a plumber"
   - "I'd like an appointment for tomorrow at 10am"
   - "It's a leaking tap in the kitchen"

**Option B: Use Retell Dashboard (Web Call)**
1. Go to Retell Dashboard → Agents
2. Find "Test Plumbing Co - AI Receptionist"
3. Click "Test" or "Make Call"
4. Talk through your browser microphone

## Step 8: Verify Everything Worked

### Check Call Logs in Supabase
1. Go to **Table Editor** → **call_logs**
2. You should see a new record with:
   - `call_status`: `completed`
   - `transcript`: Full conversation
   - `outcome_type`: (booking_created, callback_requested, etc.)
   - `duration_seconds`: Call length

### Check Retell Dashboard
1. Go to **Calls** or **Call History**
2. Find your test call
3. Listen to recording
4. View transcript

### Check Webhooks Were Delivered
1. In Retell Dashboard → **Webhooks**
2. Click **Recent Deliveries**
3. Should see 2-3 webhook calls:
   - `call_started` (200 OK)
   - `call_ended` (200 OK)
   - `call_analyzed` (200 OK)

## Step 9: Test Custom Functions

Make another call and test each function:

### Test 1: Booking Capture
Say: "I'd like to book an appointment for tomorrow at 2pm for a burst pipe"

**Expected:**
- AI captures: name, phone, service type, date, time, description
- AI checks availability (simplified for now)
- AI confirms the booking
- Check `call_logs.booking_data` in Supabase
- Check `call_actions` table for `booking_capture` action

### Test 2: Callback Request
Say: "Can someone call me back this afternoon at 3pm?"

**Expected:**
- AI captures: name, phone, preferred callback time, reason
- AI confirms callback scheduled
- Check `call_logs.callback_requested_for` in Supabase
- Check `call_actions` table for `callback_request` action

### Test 3: Emergency Transfer
Say: "This is an emergency! My hot water system is flooding!"

**Expected:**
- AI recognizes urgency
- AI says "Transferring you now..."
- (In production, would transfer to forwarding_number)
- Check `call_logs.emergency_transferred_to` in Supabase
- Check `call_actions` table for `emergency_transfer` action

## Troubleshooting

### "Cannot connect to Retell API"
- Check API key is correct in .env.local
- Restart dev server after adding env vars
- Check Retell account is active

### "Webhook signature invalid"
- Check webhook secret is correct
- Make sure webhook URL matches exactly
- Check Retell webhook is enabled and active

### "Phone number purchase failed"
- Check Retell account has billing set up
- Check area code is valid (2, 3, 7, 8 for Australia)
- May need to add payment method in Retell dashboard

### "No call logs created"
- Check webhooks are being delivered (Retell dashboard)
- Check Vercel/local logs for errors
- Verify customer_id exists in database

## Success Criteria ✅

- [ ] Test endpoint returns `success: true`
- [ ] Provisioning creates agent and phone number
- [ ] Can make a test call to the AI receptionist
- [ ] Call logs appear in Supabase `call_logs` table
- [ ] Transcript is captured
- [ ] At least 1 custom function works (booking, callback, or transfer)
- [ ] Webhooks show "200 OK" in Retell dashboard

## Next Steps After Testing

Once everything works:
1. Deploy to Vercel with production env vars
2. Update webhook URL to production domain (yeahmate.ai)
3. Test again in production
4. Build tradie dashboard UI (Task #15)
5. Create onboarding flow for real tradies

---

**Ready?** Let me know when you have your Retell account set up and I'll help you through each step!
