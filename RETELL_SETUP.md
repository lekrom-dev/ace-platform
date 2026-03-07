# Retell AI Setup Checklist - Module 3: Tradie Receptionist

## ✅ Completed

- [x] Database schema created (tradie_configs, call_logs, call_actions)
- [x] Migration applied to Supabase
- [x] Retell client library built
- [x] Webhook handlers implemented (call_started, call_ended, call_analyzed)
- [x] Custom functions implemented (bookingCapture, callbackRequest, emergencyTransfer)
- [x] Provisioning API created
- [x] Documentation written

## 🔲 Next Steps

### 1. Sign Up for Retell AI

1. Go to https://retellai.com
2. Sign up for an account
3. Verify your email

### 2. Get API Credentials

**API Key:**
1. Go to Retell Dashboard → Settings → API Keys
2. Click "Create New API Key"
3. Copy the key (starts with `sk_`)
4. Add to `/Users/cmorkel/ace-platform/apps/web/.env.local`:
   ```bash
   RETELL_API_KEY=sk_xxxxx
   ```

**Webhook Secret:**
1. Go to Retell Dashboard → Webhooks
2. Click "Add Webhook"
3. URL: `https://ace-platform-production.vercel.app/api/retell/webhook` (or your production URL)
4. Events: Select all (call_started, call_ended, call_analyzed)
5. Copy the signing secret (starts with `whsec_`)
6. Add to `.env.local`:
   ```bash
   RETELL_WEBHOOK_SECRET=whsec_xxxxx
   ```

### 3. Update Environment Variables in Vercel

1. Go to https://vercel.com/cmorkel/ace-platform
2. Settings → Environment Variables
3. Add:
   - `RETELL_API_KEY` = `sk_xxxxx`
   - `RETELL_WEBHOOK_SECRET` = `whsec_xxxxx`
4. Redeploy the app

### 4. Test the Integration

**Option A: Use Retell Dashboard**
1. Go to Retell Dashboard → Agents → Create Agent
2. Manually create a test agent
3. Purchase a test phone number
4. Make a test call

**Option B: Use Provisioning API**
1. Create a test customer in Supabase
2. Call the provisioning API:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/retell/provision \
     -H "Content-Type: application/json" \
     -d '{
       "customer_id": "test-customer-uuid",
       "business_name": "Test Plumbing",
       "trade_type": "plumber",
       "service_area": "Sydney",
       "forwarding_number": "+61412345678",
       "australian_area_code": 2
     }'
   ```
3. Make a test call to the returned phone number

### 5. Verify Webhooks Working

After making a test call:
1. Check Supabase → `call_logs` table for the call record
2. Check Retell Dashboard → Webhooks → Recent Deliveries
3. Check Vercel → Logs for webhook processing

## 📊 Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Retell AI Platform                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Workspace 1: Smith Plumbing                          │  │
│  │  - Agent: smith-plumbing-agent                        │  │
│  │  - Phone: +61 2 1234 5678                             │  │
│  │  - Billing: Isolated                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Workspace 2: Jones Electrical                        │  │
│  │  - Agent: jones-electrical-agent                      │  │
│  │  - Phone: +61 3 8765 4321                             │  │
│  │  - Billing: Isolated                                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Webhooks
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 ACE Platform (yeahmate.ai)                    │
│                                                               │
│  API Routes:                                                  │
│  - POST /api/retell/webhook     (receives call events)       │
│  - POST /api/retell/functions   (handles custom functions)   │
│  - POST /api/retell/provision   (creates new workspaces)     │
│                                                               │
│  Database:                                                    │
│  - tradie_configs  (workspace credentials, business info)    │
│  - call_logs       (all calls, transcripts, outcomes)        │
│  - call_actions    (bookings, callbacks, transfers)          │
└─────────────────────────────────────────────────────────────┘
```

## 💰 Cost Estimates

### Retell Costs (per tradie)
- Phone number: ~$2/month
- Calls: ~$0.05/min
- 100 calls/month × 3 min avg = $15/month
- **Total: ~$17/month per tradie**

### Module Pricing Strategy
- Starter: $99/month (margin: $82)
- Professional: $139/month (margin: $122)
- Premium: $179/month (margin: $162)

### Break-even
- 1 tradie = profitable immediately
- 10 tradies = $820-$1,620 MRR profit

## 🎯 Week 5-6 Goals (Current)

- [x] Build Retell integration code
- [ ] Sign up for Retell account
- [ ] Get API credentials
- [ ] Configure webhooks
- [ ] Test with 1 dummy tradie
- [ ] Verify all 3 custom functions work
- [ ] Build tradie dashboard (next)

## 📝 Week 6-7 Goals (Next)

- [ ] Design tradie dashboard UI
- [ ] Build call history view
- [ ] Build booking management
- [ ] Build business hours configuration
- [ ] Build Google Calendar OAuth flow
- [ ] Create onboarding wizard for new tradies

## 🚀 Domain Setup

**yeahmate.ai** is ready to use. Need to:
1. Point DNS to Vercel
2. Configure SSL certificate
3. Update webhook URLs to use yeahmate.ai
4. Build landing page

---

**Current Status:** Integration code complete, waiting for Retell account setup.

**Next Action:** Sign up for Retell AI and get API credentials, then test the integration.
