# Module 3 Testing Checklist

## Pre-Testing Setup

- [ ] Dev server running: `npm run dev`
- [ ] Supabase connected (check .env.local has correct values)
- [ ] Retell AI webhook URL set (for local testing: use ngrok or test later in production)
- [ ] Stripe webhook URL set (for local testing: use Stripe CLI or test later in production)

---

## Test 1: User Signup Flow

### Without Referral Code
1. [ ] Visit http://localhost:3000/signup
2. [ ] Create new account with test email
3. [ ] Verify email confirmation (if enabled)
4. [ ] Check Supabase `customers` table:
   - [ ] New customer record created
   - [ ] `referral_code` generated (e.g., TRADE-AB12)
   - [ ] `signup_discount_percentage` = 0
   - [ ] `referral_discount_percentage` = 0

### With Referral Code
1. [ ] Get a referral code from an existing customer
2. [ ] Visit http://localhost:3000/signup?ref=TRADE-XXXX
3. [ ] See "🎉 You've been referred! Get 10% off" banner
4. [ ] Create account
5. [ ] Check Supabase:
   - [ ] `customers.signup_discount_percentage` = 10
   - [ ] `referrals` table has new record with status='pending'

---

## Test 2: Pricing Page & Discount Display

1. [ ] Login with test account
2. [ ] Visit http://localhost:3000/pricing
3. [ ] Verify 3 tiers display correctly:
   - [ ] Starter: $79/month
   - [ ] Professional: $139/month (Most Popular badge)
   - [ ] Premium: $249/month
4. [ ] If account has discount:
   - [ ] See discount banner at top
   - [ ] Prices show crossed-out original and discounted price
   - [ ] Discount percentage displayed correctly

---

## Test 3: Stripe Checkout Flow

### Test Mode (Local)
1. [ ] Click "Get started" on Professional plan
2. [ ] Redirected to Stripe Checkout
3. [ ] See correct price (with discount if applicable)
4. [ ] Use test card: `4242 4242 4242 4242`
5. [ ] Complete checkout
6. [ ] Redirected to `/dashboard/receptionist/setup`

### Verify Database
7. [ ] Check Supabase `subscriptions` table:
   - [ ] New subscription record created
   - [ ] `status` = 'active'
   - [ ] `plan_id` matches selected tier
   - [ ] `stripe_subscription_id` populated
8. [ ] Check `customers` table:
   - [ ] `stripe_customer_id` populated
9. [ ] If referred customer:
   - [ ] Check `referrals` table: status changed to 'active'
   - [ ] Check referrer's `active_referrals_count` increased
   - [ ] Check referrer's `referral_discount_percentage` updated

---

## Test 4: Dashboard Access

1. [ ] Visit http://localhost:3000/dashboard/receptionist
2. [ ] See main dashboard with cards:
   - [ ] Setup (if not completed)
   - [ ] Call Logs
   - [ ] Referrals
   - [ ] Settings
3. [ ] Click through each section:
   - [ ] Setup wizard loads
   - [ ] Settings page loads
   - [ ] Referrals page loads and shows referral code

---

## Test 5: Referrals Page

1. [ ] Visit http://localhost:3000/dashboard/receptionist/referrals
2. [ ] See your referral code (e.g., TRADE-AB12)
3. [ ] Click "Copy Code" - verify copied to clipboard
4. [ ] Click "Copy Link" - verify copied to clipboard
5. [ ] Stats display correctly:
   - [ ] Current discount percentage
   - [ ] Monthly savings amount
   - [ ] Active referrals count
   - [ ] Total referrals count
6. [ ] Progress bar shows correct progress to 100%

---

## Test 6: Retell Provisioning API

### Create Test Configuration
```bash
curl -X POST http://localhost:3000/api/retell/provision \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "YOUR_CUSTOMER_UUID",
    "business_name": "Test Plumbing Co",
    "trade_type": "plumber",
    "service_area": "Sydney",
    "forwarding_number": "+61412345678",
    "australian_area_code": 2
  }'
```

### Verify
1. [ ] API returns success with phone number
2. [ ] Check Supabase `tradie_configs` table:
   - [ ] New config created
   - [ ] `retell_workspace_id` populated
   - [ ] `retell_agent_id` populated
   - [ ] `retell_phone_id` populated
   - [ ] `phone_number` assigned

---

## Test 7: Retell Webhooks (Requires Production/ngrok)

### Setup for Local Testing
```bash
# If testing locally, use ngrok
ngrok http 3000

# Update Retell webhook URL to:
# https://YOUR-NGROK-URL.ngrok.io/api/retell/webhook
```

### Test Call Flow
1. [ ] Make test call to Retell phone number
2. [ ] AI answers with greeting
3. [ ] Say: "I need to book a plumber"
4. [ ] Provide booking details
5. [ ] Call ends

### Verify Webhooks
6. [ ] Check Supabase `call_logs`:
   - [ ] New call record created
   - [ ] `transcript` populated
   - [ ] `summary` generated
   - [ ] `outcome` recorded
7. [ ] Check `call_actions`:
   - [ ] Booking action created with details
   - [ ] Status = 'pending'

---

## Test 8: Emergency Handling

### Without Emergency Number
1. [ ] Make test call
2. [ ] Say: "This is an emergency! My house is flooding!"
3. [ ] AI should:
   - [ ] Recognize emergency
   - [ ] Tell caller help is coming in 5 minutes
   - [ ] Send SMS to forwarding number
4. [ ] Verify:
   - [ ] SMS received at forwarding number
   - [ ] Call log marked as emergency
   - [ ] Action type = 'emergency_transfer'

### With Emergency Number (Optional)
1. [ ] Add emergency number in settings
2. [ ] Make emergency call
3. [ ] Verify:
   - [ ] Call transferred to emergency number
   - [ ] SMS still sent to forwarding number

---

## Test 9: Subscription Webhooks

### Test via Stripe Dashboard
1. [ ] Go to Stripe Dashboard → Subscriptions
2. [ ] Find test subscription
3. [ ] Test these scenarios:
   - [ ] Update subscription (change plan)
   - [ ] Cancel subscription
   - [ ] Reactivate subscription

### Verify Database Updates
4. [ ] Check `subscriptions` table updates correctly
5. [ ] If cancellation with referral:
   - [ ] Check referral status changed to 'churned'
   - [ ] Check referrer's discount decreased

---

## Test 10: Error Handling

1. [ ] Try to access dashboard without login → redirected to login
2. [ ] Try to access pricing without login → should work (public page)
3. [ ] Try invalid referral code → should handle gracefully
4. [ ] Try checkout with declined card: `4000000000000002`
5. [ ] Verify error messages are user-friendly

---

## Production Testing (After Deployment)

After deploying to Vercel:

1. [ ] Update Retell webhook URL to production domain
2. [ ] Update Stripe webhook URL to production domain
3. [ ] Test complete signup → payment → webhook flow
4. [ ] Make real test call to Retell number
5. [ ] Verify all webhooks fire correctly
6. [ ] Test with real (test mode) payment

---

## Success Criteria

✅ All tests pass
✅ Webhooks firing correctly
✅ Database updates happening
✅ No console errors
✅ No broken pages
✅ Payments processing
✅ Referrals tracking correctly

---

## Notes

- Use Stripe test cards: https://stripe.com/docs/testing
- Use ngrok for local webhook testing: https://ngrok.com
- Check Vercel logs for production debugging
- Monitor Stripe webhook delivery status
- Check Retell dashboard for call logs
