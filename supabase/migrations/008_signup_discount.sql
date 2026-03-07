-- Migration 008: Signup Discount for Referred Customers
-- Adds signup_discount_percentage to track one-time signup discount

-- Add signup discount column to customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS signup_discount_percentage INTEGER DEFAULT 0;

-- Update the activate_referral function to set signup discount
CREATE OR REPLACE FUNCTION activate_referral(p_referral_id UUID)
RETURNS VOID AS $$
DECLARE
    v_referrer_id UUID;
    v_referred_id UUID;
    v_referral_status TEXT;
BEGIN
    -- Get referral details
    SELECT referrer_customer_id, referred_customer_id, status
    INTO v_referrer_id, v_referred_id, v_referral_status
    FROM referrals
    WHERE id = p_referral_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referral not found: %', p_referral_id;
    END IF;

    -- Only activate if pending
    IF v_referral_status != 'pending' THEN
        RAISE EXCEPTION 'Referral is not in pending status: %', v_referral_status;
    END IF;

    -- Activate the referral
    UPDATE referrals
    SET status = 'active', activated_at = NOW()
    WHERE id = p_referral_id;

    -- Update referrer's stats
    PERFORM update_referral_stats(v_referrer_id);

    -- Give referred customer 10% signup discount (one-time, only if they don't have one)
    UPDATE customers
    SET signup_discount_percentage = 10
    WHERE id = v_referred_id
      AND signup_discount_percentage = 0;

    RAISE NOTICE 'Referral activated: % (Referrer: %, Referred: %)', p_referral_id, v_referrer_id, v_referred_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update churn_referral function (no changes needed, but recreate for consistency)
CREATE OR REPLACE FUNCTION churn_referral(p_referral_id UUID)
RETURNS VOID AS $$
DECLARE
    v_referrer_id UUID;
    v_referral_status TEXT;
BEGIN
    -- Get referral details
    SELECT referrer_customer_id, status
    INTO v_referrer_id, v_referral_status
    FROM referrals
    WHERE id = p_referral_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referral not found: %', p_referral_id;
    END IF;

    -- Only churn if active
    IF v_referral_status != 'active' THEN
        RAISE EXCEPTION 'Referral is not in active status: %', v_referral_status;
    END IF;

    -- Mark as churned
    UPDATE referrals
    SET status = 'churned', churned_at = NOW()
    WHERE id = p_referral_id;

    -- Update referrer's stats
    PERFORM update_referral_stats(v_referrer_id);

    RAISE NOTICE 'Referral churned: % (Referrer: %)', p_referral_id, v_referrer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
