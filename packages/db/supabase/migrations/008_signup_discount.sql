-- Migration: Signup Discount for Referred Customers
-- Description: Track and apply 10% discount for customers who sign up with a referral code

-- ============================================================================
-- UPDATE CUSTOMERS TABLE
-- ============================================================================

-- Add signup discount tracking
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS signup_discount_percentage INTEGER DEFAULT 0;

-- Add index
CREATE INDEX IF NOT EXISTS idx_customers_signup_discount ON customers(signup_discount_percentage) WHERE signup_discount_percentage > 0;

-- ============================================================================
-- UPDATE REFERRAL FUNCTIONS
-- ============================================================================

-- Update the referral activation logic to also set signup discount
CREATE OR REPLACE FUNCTION activate_referral(p_referral_id UUID)
RETURNS VOID AS $$
DECLARE
    v_referrer_id UUID;
    v_referred_id UUID;
BEGIN
    -- Get referral details
    SELECT referrer_customer_id, referred_customer_id
    INTO v_referrer_id, v_referred_id
    FROM referrals
    WHERE id = p_referral_id;

    -- Update referral status to active
    UPDATE referrals
    SET
        status = 'active',
        activated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_referral_id;

    -- Update referrer's stats (they get 10% per active referral)
    PERFORM update_referral_stats(v_referrer_id);

    -- Give the new customer their 10% signup discount (if not already set)
    UPDATE customers
    SET signup_discount_percentage = 10
    WHERE id = v_referred_id
      AND signup_discount_percentage = 0;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN customers.signup_discount_percentage IS 'Signup discount for customers referred by others. Typically 10% for life. Different from referral_discount_percentage which is earned by referring others.';
