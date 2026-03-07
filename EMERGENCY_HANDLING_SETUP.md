# Emergency Handling - Option C Implementation

## ✅ What's Been Implemented

### 1. Database Schema
**Migration: `005_add_emergency_number.sql`**
- Added `emergency_number` field to `tradie_configs` table
- Optional field for separate emergency line

### 2. SMS Alert System
**File: `/lib/twilio/sms.ts`**
- `sendEmergencyAlert()` - Sends urgent SMS to tradie
- `sendBookingConfirmation()` - Sends booking confirmations
- `sendCallbackConfirmation()` - Sends callback notifications

**SMS Format:**
```
🚨 EMERGENCY CALL - Test Plumbing Co

Sarah Johnson at +61 412 345 678 has reported:
Hot water system flooding laundry

CALL THEM NOW: +61 412 345 678

This is an urgent situation requiring immediate attention.
```

### 3. Updated Emergency Transfer Logic
**File: `/app/api/retell/functions/route.ts`**

**Always happens:**
- ✅ SMS alert sent to tradie's forwarding_number
- ✅ Emergency logged in database
- ✅ Call details captured

**If emergency_number is set:**
- ⚡ Direct call transfer to emergency_number
- 🎙️ AI says: "Transferring you now..."

**If emergency_number is NOT set:**
- 📱 SMS alert sent
- 🎙️ AI says: "I've sent an emergency alert to [tradie]. They'll call you back within 5 minutes."

### 4. Onboarding Flow
**Page: `/dashboard/receptionist/setup`**

Features:
- ✅ Step-by-step setup guide
- ✅ Call forwarding instructions (iOS & Android)
- ✅ MMI code for conditional forwarding: `**61*[number]#`
- ✅ Settings-based forwarding instructions
- ✅ Test your setup checklist
- ✅ Emergency handling explanation

### 5. Settings Page
**Page: `/dashboard/receptionist/settings`**

Added:
- ✅ Emergency Handling section
- ✅ Shows SMS alert status (always enabled)
- ✅ Optional emergency number field
- ✅ Add/change/remove emergency number
- ⚠️ Warning about call loops

## 🔧 How It Works

### Scenario A: No Emergency Number (Default)

```
Customer calls → AI recognizes emergency
                    ↓
          SMS sent to tradie's mobile
                    ↓
    AI tells customer: "Help is coming in 5 min"
                    ↓
         Tradie calls customer back
```

**Pros:**
- Works for everyone
- No special setup needed
- No call loop issues
- Still fast response (5 min)

**Cons:**
- Not instant transfer
- Requires tradie to act on SMS

### Scenario B: With Emergency Number (Optional)

```
Customer calls → AI recognizes emergency
                    ↓
          SMS sent to tradie's mobile
                    ↓
    Call transferred to emergency_number
                    ↓
          Tradie answers immediately
```

**Pros:**
- Instant transfer
- Customer stays on line
- Faster response

**Cons:**
- Requires second phone/number
- Risk of loop if configured wrong

## 📋 Setup Instructions for Tradies

### Step 1: Apply Database Migration

Run in Supabase SQL Editor:
```sql
ALTER TABLE tradie_configs
ADD COLUMN IF NOT EXISTS emergency_number TEXT;
```

Or apply the migration file.

### Step 2: Add Twilio Phone Number

Set environment variable:
```bash
TWILIO_PHONE_NUMBER=+61 2 XXXX XXXX
```

This is used as the SMS sender number.

### Step 3: Enable Call Forwarding

**Option A - Conditional (Recommended):**
Dial on mobile: `**61*[AI_NUMBER]#`

**Option B - All Calls:**
Settings → Phone → Call Forwarding → ON → Enter AI number

### Step 4: (Optional) Add Emergency Number

In Settings page:
- Click "Add Number" under Emergency Handling
- Enter separate number (NOT the forwarded mobile)
- Examples:
  - Partner's phone
  - Second business phone
  - After-hours emergency line

### Step 5: Test

1. Call your forwarded mobile from different phone
2. Don't answer
3. AI should pick up after 15-30 seconds
4. Say: "This is an emergency, my house is flooding!"
5. Check SMS received

## ⚠️ Important Call Loop Warning

**DON'T DO THIS:**
```
Mobile: +61 412 345 678 (forwards to AI)
Emergency Number: +61 412 345 678 (SAME!)
→ Creates infinite loop ❌
```

**DO THIS:**
```
Mobile: +61 412 345 678 (forwards to AI)
Emergency Number: +61 413 999 888 (DIFFERENT!)
→ Works perfectly ✅
```

Or just don't set emergency number (SMS alert only).

## 🧪 Testing Checklist

- [ ] Database migration applied
- [ ] Twilio credentials configured
- [ ] Call forwarding enabled on tradie mobile
- [ ] Test call goes to AI
- [ ] SMS alert received for emergency
- [ ] (If using) Emergency transfer works
- [ ] Dashboard shows emergency call log
- [ ] No call loops occurring

## 📊 Dashboard Features

**Emergency calls are highlighted:**
- 🚨 Red badge: "emergency_transfer"
- High priority flag
- SMS delivery status
- Transfer success/failure log

## 🚀 Next Steps

1. Apply migration to production
2. Update onboarding flow to explain options
3. Add SMS delivery tracking
4. Add voice call option (automated call to tradie)
5. Add dashboard alerts/notifications
6. Add Twilio usage tracking

## 💰 Cost Impact

**SMS Alerts (Twilio):**
- ~$0.08 AUD per SMS
- Average 1-2 emergency calls per week
- ~$0.50/month per tradie

**Still profitable:**
- Charging $99-$179/month
- Emergency SMS: $0.50/month
- Regular call minutes: $15/month
- **Total cost: ~$15.50/month**
- **Margin: $83.50 - $163.50/month**

## 📱 User Experience

**Customer perspective:**
```
Customer: "My hot water system is flooding!"

AI: "I understand this is critical. I'm sending an emergency
     alert to Test Plumbing Co right now. They'll call you
     back at this number within 5 minutes."

[If emergency_number set]
AI: "I'm transferring you to Test Plumbing Co right now.
     Please hold."

[Call connects directly]
```

**Tradie perspective:**
```
📱 SMS: 🚨 EMERGENCY CALL - Test Plumbing Co
       Sarah Johnson at +61 412 345 678:
       Hot water system flooding laundry
       CALL THEM NOW!

[Tradie calls back immediately]
or
[Phone rings with transferred call]
```

## ✨ Key Benefits

1. **No loops** - SMS fallback prevents forwarding loops
2. **Always notified** - SMS sent even if transfer fails
3. **Flexible** - Works with or without emergency number
4. **Simple setup** - Just dial one code or toggle setting
5. **Fast response** - 5 min callback or instant transfer
6. **Reliable** - Multiple notification channels

---

**Implementation Status:** ✅ Complete and ready to test
**Migration Required:** Yes (005_add_emergency_number.sql)
**Testing Required:** Yes (follow testing checklist)
