# Referral Program - 10% Off Per Mate

## 🎯 Overview

**Referral Reward:** 10% discount per active referred customer
**Maximum Discount:** 100% (FREE service with 10+ active referrals)
**Duration:** Discount applies as long as referrals remain paying customers

## ✅ What's Been Implemented

### 1. Database Schema (`006_referral_system.sql`)

**New Columns on `customers` table:**
- `referral_code` - Unique code (e.g., "TRADE-AB12")
- `referred_by_customer_id` - Who referred this customer
- `active_referrals_count` - Cache of active referrals
- `total_referrals_count` - All-time referrals
- `referral_discount_percentage` - Current discount (0-100%)

**New `referrals` table:**
- Tracks referral relationships
- Status: pending → active → churned
- Timestamps for lifecycle events

**Automated Functions:**
- `generate_referral_code()` - Creates unique TRADE-XXXX codes
- `calculate_referral_discount()` - Calculates 10% per active referral
- `update_referral_stats()` - Updates cached counts
- Auto-triggers on referral status changes

### 2. Referral Dashboard (`/dashboard/receptionist/referrals`)

**Features:**
- 📊 Stats cards: Discount %, Monthly Savings, Active/Total Referrals
- 📈 Progress bar to 100% discount
- 🔗 Shareable referral code & link
- 📋 List of all referrals with status
- 📱 One-click copy buttons

### 3. Dashboard Integration

**Main Dashboard Updates:**
- Added Referrals card to quick actions
- Highlighted with green gradient
- Easy access to referral program

## 🎨 User Experience

### For the Referrer (Tradie Sharing Code)

1. **Get Referral Code**
   - Auto-generated on signup: `TRADE-AB12`
   - View in Referrals page

2. **Share with Mates**
   - Copy code: `TRADE-AB12`
   - Copy full link: `https://yeahmate.ai/signup?ref=TRADE-AB12`
   - Share via SMS, email, WhatsApp, etc.

3. **Earn Discounts**
   - Mate signs up → Status: "pending"
   - Mate subscribes → Status: "active" → You get 10% off!
   - Each active referral = 10% more discount
   - 10 referrals = 100% discount = FREE!

4. **Track Progress**
   - Dashboard shows current discount %
   - See monthly savings amount ($13.90 per referral on $139 plan)
   - View all referrals and their status
   - Progress bar to free service

### For the Referred (New Tradie)

1. **Receive Referral**
   - Click link: `yeahmate.ai/signup?ref=TRADE-AB12`
   - Or enter code during signup

2. **Sign Up**
   - Complete registration
   - Referral tracked automatically

3. **Subscribe**
   - Choose plan (Starter/Professional/Premium)
   - Becomes paying customer
   - Referrer gets 10% discount activated

## 💰 Economics

### Example Scenarios

**Scenario 1: 3 Active Referrals**
- Plan: Professional ($139/month)
- Discount: 30% ($41.70/month)
- Pay: $97.30/month
- Annual savings: $500.40

**Scenario 2: 10 Active Referrals**
- Plan: Professional ($139/month)
- Discount: 100% ($139/month)
- Pay: $0/month
- Annual savings: $1,668

### For ACE Platform

**Cost:**
- Each referral costs 10% of subscription
- With 10 referrals giving free service, platform gets 10 paying customers
- Net: 9 full-price + 1 free = 9x revenue vs 0

**Win-Win:**
- Tradie: Free service for spreading the word
- Platform: 10x customer base growth
- New customers: Get trusted recommendation

## 🔧 Technical Implementation

### Discount Calculation Logic

```sql
-- Active referrals = referred customers with active subscriptions
SELECT COUNT(*)
FROM referrals r
INNER JOIN subscriptions s ON s.customer_id = r.referred_customer_id
WHERE r.referrer_customer_id = 'customer_uuid'
  AND r.status = 'active'
  AND s.status = 'active'
  AND s.module_id = 'tradie-receptionist'

-- Discount = MIN(active_count * 10, 100)
```

### Status Transitions

```
PENDING → ACTIVE → CHURNED

Pending:  Signed up, not paying yet
Active:   Paying subscription
Churned:  Cancelled subscription
```

### Automatic Updates

**Triggers update referrer stats when:**
- Referral signs up (pending)
- Referral subscribes (active)
- Referral cancels (churned)
- Referral reactivates (active again)

### Stripe Integration (TODO)

When applying discount:
1. Get `referral_discount_percentage` from customer
2. Apply as coupon to Stripe subscription
3. Update on each billing cycle
4. Recalculate if referral status changes

## 📋 Setup Instructions

### Step 1: Apply Migration

**Option A - Supabase Dashboard:**
1. Go to SQL Editor
2. Copy contents of `006_referral_system.sql`
3. Run the migration
4. Verify: `SELECT referral_code FROM customers LIMIT 5;`

**Option B - CLI (if linked):**
```bash
npx supabase db push
```

### Step 2: Test the Feature

1. Login to dashboard
2. Visit: http://localhost:3000/dashboard/receptionist/referrals
3. See your referral code
4. Copy and test share functionality

### Step 3: Create Test Referrals (Optional)

```sql
-- Simulate referrals for testing
INSERT INTO referrals (
  referrer_customer_id,
  referred_customer_id,
  referral_code_used,
  status,
  activated_at
) VALUES (
  (SELECT id FROM customers WHERE email = 'test-tradie@yeahmate.ai'),
  (SELECT id FROM customers WHERE email = 'other-customer@example.com'),
  'TRADE-TEST',
  'active',
  NOW()
);

-- Update referrer stats
SELECT update_referral_stats(
  (SELECT id FROM customers WHERE email = 'test-tradie@yeahmate.ai')
);
```

## 🚀 Future Enhancements

### Phase 1 (MVP) - Complete ✅
- [x] Database schema
- [x] Referral code generation
- [x] Discount calculation
- [x] Referral dashboard
- [x] Share functionality

### Phase 2 - Integration
- [ ] Signup flow with referral code input
- [ ] Auto-apply discount to Stripe subscription
- [ ] Email notifications (referral signed up, became active)
- [ ] SMS notifications for milestones (5 referrals, 10 referrals)

### Phase 3 - Analytics
- [ ] Referral conversion tracking
- [ ] Lifetime value by referral source
- [ ] Top referrers leaderboard
- [ ] Referral performance charts

### Phase 4 - Gamification
- [ ] Badges (5 referrals, 10 referrals, 25 referrals)
- [ ] Bonus rewards (refer 20 = extra features)
- [ ] Referral contests/competitions
- [ ] Social sharing integration

## 🧪 Testing Checklist

- [ ] Migration applied successfully
- [ ] Existing customers have referral codes
- [ ] Referral dashboard loads
- [ ] Can copy referral code
- [ ] Can copy referral link
- [ ] Referral stats display correctly
- [ ] Progress bar shows correct percentage
- [ ] Referral list shows correct data
- [ ] Status badges show correct colors

## 📊 Success Metrics

**Week 1:**
- 50% of customers view referrals page
- 25% copy their referral code

**Month 1:**
- Average 0.5 referrals per customer
- 10% conversion rate (referral → paying customer)

**Month 3:**
- Average 2 referrals per customer
- 20% conversion rate
- 5% of customers at 100% discount (free service)

## 💡 Marketing Copy

**Dashboard Card:**
> "Refer mates, get 10% off each! Get your service FREE with 10 referrals."

**Referrals Page Header:**
> "Get 10% off for every mate you refer! Share your code and save."

**Email Subject:**
> "Get Your AI Receptionist FREE - Refer 10 Mates"

**Social Media:**
> "Never miss a call again! My AI receptionist handles bookings 24/7. Use code TRADE-AB12 to try it. We both save 10%! 🎉"

## 🔒 Fraud Prevention (Future)

- Limit referrals per IP/device
- Verify email/phone before activation
- Flag suspicious patterns
- Manual review for high-volume referrers
- Require minimum subscription period

---

**Status:** ✅ Ready to apply migration and test
**Next:** Apply migration, test UI, integrate with signup flow
