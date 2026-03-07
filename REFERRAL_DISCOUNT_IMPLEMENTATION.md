# Referral Discount Implementation - Complete Guide

## 🎯 Overview

**Two-Way Discount System:**
- **New Customers:** Get 10% off when signing up with a referral code (lifetime)
- **Referrers:** Get 10% off for each active referral (stackable up to 100% = FREE)

## ✅ What's Been Implemented

### 1. Database Schema

**Migration 008: `008_signup_discount.sql`**
- Added `signup_discount_percentage` column to `customers` table
- Function `activate_referral()` handles:
  - Updates referral status from "pending" to "active"
  - Sets new customer's signup discount to 10%
  - Updates referrer's stats and discount percentage

**Flow:**
```
Signup with code → pending referral + 10% signup discount
       ↓
Subscribe → activate referral → referrer gets 10% per active referral
```

### 2. Signup Flow with Referral Tracking

**Updated: `/app/(auth)/signup/page.tsx`**
- Captures `?ref=TRADE-XXXX` from URL
- Validates referral code in real-time
- Shows banner: "🎉 You've been referred by [Name]! Get 10% off"
- Passes referral code to backend during signup

**New API: `/api/auth/signup/route.ts`**
```typescript
POST /api/auth/signup
{
  "email": "newtradie@example.com",
  "password": "password123",
  "fullName": "John Smith",
  "businessName": "John's Plumbing",
  "referralCode": "TRADE-AB12" // Optional
}
```

**What it does:**
1. Validates referral code (if provided)
2. Creates Supabase auth user
3. Creates customer record with:
   - `referred_by_customer_id` (if referred)
   - `signup_discount_percentage` = 10 (if referred)
   - Auto-generated `referral_code` for the new customer
4. Creates referral record (status: "pending")

### 3. Referral Activation

**New API: `/api/subscriptions/activate-referral/route.ts`**
```typescript
POST /api/subscriptions/activate-referral
{
  "customerId": "uuid",
  "subscriptionId": "sub_xxx",
  "moduleId": "tradie-receptionist"
}
```

**What it does:**
1. Finds pending referral for this customer
2. Calls `activate_referral()` database function
3. Updates referrer's discount (10% per active referral)
4. Confirms new customer has 10% signup discount

**When to call:**
- When a new subscription is created (Stripe webhook)
- When a subscription status changes to "active"
- After payment is confirmed

### 4. Stripe Discount Integration

**New Module: `/lib/stripe/discounts.ts`**

Key functions:

```typescript
// Get all discounts for a customer
getCustomerDiscounts(customerId) → {
  signupDiscount: 10,      // If they were referred
  referralDiscount: 30,    // If they have 3 active referrals
  totalDiscount: 40        // Combined (max 100%)
}

// Apply discount to Stripe subscription
applyDiscountToSubscription(subscriptionId, customerId)

// Update all subscriptions when referral count changes
updateCustomerSubscriptionDiscounts(customerId, stripeCustomerId)

// Calculate final price
calculateDiscountedPrice(139, discounts) → 83.40 (with 40% discount)
```

**How it works:**
- Creates Stripe coupons: `customer-{id}-{discount}pct`
- Applies as forever discount to subscription
- Auto-updates when referral count changes

### 5. SMS Invitation Feature

**UI: Updated `/dashboard/receptionist/referrals/page.tsx`**
- "📱 Invite Mates via SMS" section
- Add multiple phone numbers
- Pre-filled message: "G'day! [Name] here - I'm using Yeahmate.ai as my AI receptionist..."
- Schedules SMS for tomorrow at 10 AM + follow-up call 24h later

**Migration 007: `007_referral_invitations.sql`**
- `referral_invitations` table tracks scheduled SMS/calls
- Status: scheduled → sms_sent → call_made → signed_up

**API: `/api/referrals/send-invites/route.ts`**
- Normalizes Australian phone numbers (+61 format)
- Schedules invitations for tomorrow
- Prevents duplicate invites within 30 days

**Cron: `/api/cron/send-referral-invites/route.ts`**
- Runs hourly to send scheduled SMS
- Uses Twilio for SMS delivery
- Tracks success/failure

## 🚀 How to Deploy

### Step 1: Apply Database Migrations

**Run these in Supabase SQL Editor (in order):**

1. **Referral System** (if not done yet):
```bash
# File: 006_referral_system.sql
# Adds: referral_code, referrals table, discount calculation
```

2. **Referral Invitations** (SMS feature):
```bash
# File: 007_referral_invitations.sql
# Adds: referral_invitations table for SMS tracking
```

3. **Signup Discount**:
```bash
# File: 008_signup_discount.sql
# Adds: signup_discount_percentage, activate_referral() function
```

### Step 2: Set Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_PUBLISHABLE_KEY=pk_xxx

# Twilio (for SMS invitations)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+61xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Cron Security
CRON_SECRET=random-secret-key
```

### Step 3: Set Up Cron Job

**Option A - Vercel Cron:**
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/send-referral-invites",
    "schedule": "0 * * * *"
  }]
}
```

**Option B - External Cron:**
Schedule hourly POST to:
```
https://yeahmate.ai/api/cron/send-referral-invites
Header: Authorization: Bearer {CRON_SECRET}
```

### Step 4: Integrate with Subscription Flow

**When creating a subscription:**
```typescript
// After Stripe subscription is created
await fetch('/api/subscriptions/activate-referral', {
  method: 'POST',
  body: JSON.stringify({
    customerId: customer.id,
    subscriptionId: subscription.id,
    moduleId: 'tradie-receptionist',
  }),
})

// Apply discount to Stripe
import { applyDiscountToSubscription } from '@/lib/stripe/discounts'
await applyDiscountToSubscription(subscription.id, customer.id)
```

**When referral count changes:**
```typescript
import { updateCustomerSubscriptionDiscounts } from '@/lib/stripe/discounts'

// After a referral activates or churns
await updateCustomerSubscriptionDiscounts(customerId, stripeCustomerId)
```

## 💰 Economics Example

**Scenario: John (Referrer) + Mike (New Customer)**

### Initial State
- John: Has 2 active referrals → 20% discount on $139 plan → Pays $111.20/month
- Mike: Clicks John's referral link

### Mike Signs Up
1. URL: `yeahmate.ai/signup?ref=TRADE-JOHN`
2. Sees: "🎉 You've been referred by John! Get 10% off"
3. Signs up → Database creates:
   - Mike's customer record with `signup_discount_percentage = 10`
   - Referral record (John → Mike, status: "pending")

### Mike Subscribes
1. Mike subscribes to $139 Professional plan
2. API call: `/api/subscriptions/activate-referral`
3. Database updates:
   - Referral status: "pending" → "active"
   - John's stats: `active_referrals_count = 3`
   - John's discount: `referral_discount_percentage = 30`
4. Stripe updates:
   - Mike gets coupon: 10% off → Pays $125.10/month
   - John gets coupon: 30% off → Pays $97.30/month

### If Mike Cancels
1. Subscription webhook detects cancellation
2. Referral status: "active" → "churned"
3. John's discount drops back to 20% → Pays $111.20/month
4. Mike still has 10% discount if he reactivates

## 📊 Tracking & Analytics

**Query: Customer discount breakdown**
```sql
SELECT
  c.name,
  c.email,
  c.signup_discount_percentage as signup_discount,
  c.referral_discount_percentage as referral_discount,
  (c.signup_discount_percentage + c.referral_discount_percentage) as total_discount,
  c.active_referrals_count,
  c.total_referrals_count
FROM customers c
WHERE c.signup_discount_percentage > 0
   OR c.referral_discount_percentage > 0
ORDER BY total_discount DESC;
```

**Query: Referral conversion funnel**
```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM referrals
GROUP BY status
ORDER BY
  CASE status
    WHEN 'active' THEN 1
    WHEN 'pending' THEN 2
    WHEN 'churned' THEN 3
  END;
```

## 🧪 Testing Checklist

### Test Signup Flow
- [ ] Visit: `http://localhost:3000/signup?ref=TRADE-XXXX`
- [ ] Should see referral banner with referrer's name
- [ ] Sign up creates customer with 10% signup discount
- [ ] Referral record created with status "pending"

### Test Referral Activation
- [ ] Create subscription for new customer
- [ ] Call activate-referral API
- [ ] Verify referral status is "active"
- [ ] Verify referrer's discount increased by 10%
- [ ] Verify new customer has 10% discount

### Test Stripe Integration
- [ ] Create Stripe subscription
- [ ] Verify coupon applied (10% for new customer)
- [ ] Add another referral
- [ ] Verify referrer's coupon updated (20%, 30%, etc.)
- [ ] At 10 referrals, verify 100% discount (free)

### Test SMS Invitations
- [ ] Visit /dashboard/receptionist/referrals
- [ ] Add phone numbers in "Invite Mates" section
- [ ] Click send
- [ ] Verify records in referral_invitations table
- [ ] Run cron job manually
- [ ] Verify SMS sent via Twilio

## 🎯 Next Steps

1. **Apply migrations** (006, 007, 008)
2. **Test signup flow** with referral code
3. **Integrate with Stripe subscription creation**
4. **Set up cron job** for SMS invitations
5. **Add webhook** to handle subscription changes
6. **Test end-to-end** flow with real payment

## 🔒 Security Notes

- Service role key only used server-side
- Referral codes validated before creating relationships
- Cron endpoints protected with secret token
- Stripe webhooks should verify signatures
- Rate limit signup endpoint to prevent abuse

---

**Status:** ✅ Ready to test
**Next:** Apply migrations → Test signup flow → Integrate Stripe
