-- Migration: Referral System
-- Description: Add referral tracking for 10% discount per referred paying customer

-- ============================================================================
-- UPDATE CUSTOMERS TABLE
-- ============================================================================

-- Add referral code (unique for each customer)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Add referred_by tracking
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS referred_by_customer_id UUID REFERENCES customers(id);

-- Add referral stats cache (for performance)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS active_referrals_count INTEGER DEFAULT 0;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS total_referrals_count INTEGER DEFAULT 0;

-- Add discount tracking
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS referral_discount_percentage INTEGER DEFAULT 0;

-- Create index for referral lookups
CREATE INDEX IF NOT EXISTS idx_customers_referral_code ON customers(referral_code);
CREATE INDEX IF NOT EXISTS idx_customers_referred_by ON customers(referred_by_customer_id);

-- ============================================================================
-- REFERRALS TABLE
-- ============================================================================
-- Detailed tracking of referral relationships and status

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Referral relationship
    referrer_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    referred_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- Referral details
    referral_code_used TEXT NOT NULL,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending', -- pending, active, churned

    -- Timestamps
    referred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ, -- When referred customer became paying
    churned_at TIMESTAMPTZ, -- When referred customer cancelled

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate referrals
    UNIQUE(referrer_customer_id, referred_customer_id)
);

-- Indexes for referral queries
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character code: TRADE-XXXX format
        new_code := 'TRADE-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM customers WHERE referral_code = new_code) INTO code_exists;

        -- Exit loop if unique
        EXIT WHEN NOT code_exists;
    END LOOP;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Calculate referral discount for a customer
CREATE OR REPLACE FUNCTION calculate_referral_discount(customer_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
    discount_pct INTEGER;
BEGIN
    -- Count active referrals (customers with active subscriptions)
    SELECT COUNT(*)
    INTO active_count
    FROM referrals r
    INNER JOIN customers c ON c.id = r.referred_customer_id
    INNER JOIN subscriptions s ON s.customer_id = c.id
    WHERE r.referrer_customer_id = customer_uuid
      AND r.status = 'active'
      AND s.status = 'active'
      AND s.module_id = 'tradie-receptionist';

    -- Calculate discount: 10% per referral, max 100%
    discount_pct := LEAST(active_count * 10, 100);

    RETURN discount_pct;
END;
$$ LANGUAGE plpgsql;

-- Update referral stats (call this when referral status changes)
CREATE OR REPLACE FUNCTION update_referral_stats(customer_uuid UUID)
RETURNS VOID AS $$
DECLARE
    active_count INTEGER;
    total_count INTEGER;
    new_discount INTEGER;
BEGIN
    -- Count active referrals
    SELECT COUNT(*) INTO active_count
    FROM referrals
    WHERE referrer_customer_id = customer_uuid
      AND status = 'active';

    -- Count total referrals
    SELECT COUNT(*) INTO total_count
    FROM referrals
    WHERE referrer_customer_id = customer_uuid;

    -- Calculate discount
    new_discount := calculate_referral_discount(customer_uuid);

    -- Update customer record
    UPDATE customers
    SET
        active_referrals_count = active_count,
        total_referrals_count = total_count,
        referral_discount_percentage = new_discount,
        updated_at = NOW()
    WHERE id = customer_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-generate referral code for new customers
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_referral_code
    BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION set_referral_code();

-- Update referral stats when referrals change
CREATE OR REPLACE FUNCTION trigger_update_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stats for the referrer
    IF TG_OP = 'DELETE' THEN
        PERFORM update_referral_stats(OLD.referrer_customer_id);
    ELSE
        PERFORM update_referral_stats(NEW.referrer_customer_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_referral_stats_update
    AFTER INSERT OR UPDATE OR DELETE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_referral_stats();

-- ============================================================================
-- BACKFILL EXISTING CUSTOMERS
-- ============================================================================

-- Generate referral codes for existing customers
UPDATE customers
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE referrals IS 'Tracks referral relationships between customers. Used to calculate referral discounts (10% per active referral, max 100%).';

COMMENT ON COLUMN customers.referral_code IS 'Unique referral code that this customer can share. Format: TRADE-XXXX';
COMMENT ON COLUMN customers.referred_by_customer_id IS 'The customer who referred this customer. NULL if not referred.';
COMMENT ON COLUMN customers.active_referrals_count IS 'Cached count of active referrals (for performance). Updated by trigger.';
COMMENT ON COLUMN customers.total_referrals_count IS 'Total number of customers this customer has referred (all time).';
COMMENT ON COLUMN customers.referral_discount_percentage IS 'Current discount percentage from referrals. 10% per active referral, max 100%.';

COMMENT ON COLUMN referrals.status IS 'Referral status: pending (signed up, not paying yet), active (paying customer), churned (cancelled subscription)';
COMMENT ON COLUMN referrals.activated_at IS 'When the referred customer started paying (first active subscription)';
COMMENT ON COLUMN referrals.churned_at IS 'When the referred customer cancelled their subscription';
