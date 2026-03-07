-- ACE Platform - Idempotent Migration Script
-- Safe to run multiple times - only creates what's missing
-- =====================================================

-- =====================================================
-- 001: Core Schema (IF NOT EXISTS)
-- =====================================================

-- Create custom types (with error handling)
DO $$ BEGIN
    CREATE TYPE prospect_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    business_name TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prospects table
CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    phone TEXT,
    business_name TEXT,
    trade_type TEXT,
    location TEXT,
    status prospect_status DEFAULT 'new',
    source TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_auth_user ON customers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);

-- =====================================================
-- 003: Updated At Trigger Function
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prospects_updated_at ON prospects;
CREATE TRIGGER update_prospects_updated_at
    BEFORE UPDATE ON prospects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 004: Tradie Receptionist Schema
-- =====================================================

CREATE TABLE IF NOT EXISTS tradie_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    trade_type TEXT NOT NULL,
    service_area TEXT,
    phone_number TEXT UNIQUE,
    forwarding_number TEXT,
    sms_notifications_enabled BOOLEAN DEFAULT true,
    retell_workspace_id TEXT,
    retell_api_key TEXT,
    retell_agent_id TEXT,
    retell_phone_id TEXT,
    greeting_script TEXT DEFAULT 'G''day! Thanks for calling. I''m the AI assistant. How can I help you today?',
    business_hours JSONB DEFAULT '[
        {"day": "monday", "open": "07:00", "close": "17:00", "enabled": true},
        {"day": "tuesday", "open": "07:00", "close": "17:00", "enabled": true},
        {"day": "wednesday", "open": "07:00", "close": "17:00", "enabled": true},
        {"day": "thursday", "open": "07:00", "close": "17:00", "enabled": true},
        {"day": "friday", "open": "07:00", "close": "17:00", "enabled": true},
        {"day": "saturday", "open": "08:00", "close": "12:00", "enabled": true},
        {"day": "sunday", "open": "00:00", "close": "00:00", "enabled": false}
    ]'::JSONB,
    google_calendar_connected BOOLEAN DEFAULT false,
    google_calendar_id TEXT,
    google_refresh_token TEXT,
    default_job_duration_minutes INTEGER DEFAULT 60,
    booking_buffer_minutes INTEGER DEFAULT 15,
    enable_smart_scheduling BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);

CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tradie_config_id UUID NOT NULL REFERENCES tradie_configs(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    retell_call_id TEXT UNIQUE,
    caller_phone TEXT,
    caller_name TEXT,
    call_type TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    transcript TEXT,
    summary TEXT,
    outcome TEXT,
    sentiment TEXT,
    recording_url TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    scheduled_time TIMESTAMPTZ,
    details JSONB DEFAULT '{}'::JSONB,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tradie_configs_customer ON tradie_configs(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_tradie ON call_logs(tradie_config_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_customer ON call_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_retell ON call_logs(retell_call_id);
CREATE INDEX IF NOT EXISTS idx_call_actions_call ON call_actions(call_log_id);
CREATE INDEX IF NOT EXISTS idx_call_actions_status ON call_actions(status);

-- Triggers
DROP TRIGGER IF EXISTS update_tradie_configs_updated_at ON tradie_configs;
CREATE TRIGGER update_tradie_configs_updated_at
    BEFORE UPDATE ON tradie_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_call_actions_updated_at ON call_actions;
CREATE TRIGGER update_call_actions_updated_at
    BEFORE UPDATE ON call_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 005: Emergency Number
-- =====================================================

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tradie_configs'
        AND column_name = 'emergency_number'
    ) THEN
        ALTER TABLE tradie_configs ADD COLUMN emergency_number TEXT;
    END IF;
END $$;

-- =====================================================
-- 006: Referral System
-- =====================================================

-- Add referral columns to customers
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'referral_code') THEN
        ALTER TABLE customers ADD COLUMN referral_code TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'referred_by_customer_id') THEN
        ALTER TABLE customers ADD COLUMN referred_by_customer_id UUID REFERENCES customers(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'active_referrals_count') THEN
        ALTER TABLE customers ADD COLUMN active_referrals_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'total_referrals_count') THEN
        ALTER TABLE customers ADD COLUMN total_referrals_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'referral_discount_percentage') THEN
        ALTER TABLE customers ADD COLUMN referral_discount_percentage INTEGER DEFAULT 0;
    END IF;
END $$;

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    referred_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    referral_code_used TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    activated_at TIMESTAMPTZ,
    churned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referred_customer_id),
    CONSTRAINT valid_referral_status CHECK (status IN ('pending', 'active', 'churned'))
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_customers_referral_code ON customers(referral_code);

-- Referral functions
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        code := 'TRADE-' || upper(substring(md5(random()::text) from 1 for 4));
        SELECT EXISTS(SELECT 1 FROM customers WHERE referral_code = code) INTO exists;
        EXIT WHEN NOT exists;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_referral_discount(customer_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
    discount INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO active_count
    FROM referrals
    WHERE referrer_customer_id = customer_uuid
    AND status = 'active';

    discount := active_count * 10;
    RETURN LEAST(discount, 100);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_referral_stats(customer_uuid UUID)
RETURNS VOID AS $$
DECLARE
    active_count INTEGER;
    total_count INTEGER;
    new_discount INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_count
    FROM referrals
    WHERE referrer_customer_id = customer_uuid
    AND status = 'active';

    SELECT COUNT(*) INTO total_count
    FROM referrals
    WHERE referrer_customer_id = customer_uuid;

    new_discount := LEAST(active_count * 10, 100);

    UPDATE customers
    SET
        active_referrals_count = active_count,
        total_referrals_count = total_count,
        referral_discount_percentage = new_discount,
        updated_at = NOW()
    WHERE id = customer_uuid;
END;
$$ LANGUAGE plpgsql;

-- Generate referral codes for existing customers
UPDATE customers
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- Trigger for new customers
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_customer_referral_code ON customers;
CREATE TRIGGER set_customer_referral_code
    BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION set_referral_code();

DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at
    BEFORE UPDATE ON referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 007: Referral Invitations
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    referral_code TEXT NOT NULL,
    message_content TEXT NOT NULL,
    scheduled_sms_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    sms_sid TEXT,
    sent_at TIMESTAMPTZ,
    scheduled_call_at TIMESTAMPTZ,
    call_sid TEXT,
    call_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_status CHECK (status IN ('scheduled', 'sms_sent', 'call_scheduled', 'call_completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_referral_invitations_status_scheduled
    ON referral_invitations(status, scheduled_sms_at)
    WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_referral_invitations_customer_id
    ON referral_invitations(customer_id);

CREATE OR REPLACE FUNCTION get_pending_referral_invitations()
RETURNS TABLE (
    id UUID,
    customer_id UUID,
    phone_number TEXT,
    message_content TEXT,
    scheduled_sms_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ri.id,
        ri.customer_id,
        ri.phone_number,
        ri.message_content,
        ri.scheduled_sms_at
    FROM referral_invitations ri
    WHERE ri.status = 'scheduled'
    AND ri.scheduled_sms_at <= NOW()
    ORDER BY ri.scheduled_sms_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_referral_invitations_updated_at ON referral_invitations;
CREATE TRIGGER update_referral_invitations_updated_at
    BEFORE UPDATE ON referral_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 008: Signup Discount
-- =====================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'signup_discount_percentage') THEN
        ALTER TABLE customers ADD COLUMN signup_discount_percentage INTEGER DEFAULT 0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_signup_discount
    ON customers(signup_discount_percentage)
    WHERE signup_discount_percentage > 0;

CREATE OR REPLACE FUNCTION activate_referral(p_referral_id UUID)
RETURNS VOID AS $$
DECLARE
    v_referrer_id UUID;
    v_referred_id UUID;
    v_referral_status TEXT;
BEGIN
    SELECT referrer_customer_id, referred_customer_id, status
    INTO v_referrer_id, v_referred_id, v_referral_status
    FROM referrals
    WHERE id = p_referral_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referral not found: %', p_referral_id;
    END IF;

    IF v_referral_status != 'pending' THEN
        RAISE EXCEPTION 'Referral is not in pending status: %', v_referral_status;
    END IF;

    UPDATE referrals
    SET status = 'active', activated_at = NOW()
    WHERE id = p_referral_id;

    PERFORM update_referral_stats(v_referrer_id);

    UPDATE customers
    SET signup_discount_percentage = 10
    WHERE id = v_referred_id
    AND signup_discount_percentage = 0;

    RAISE NOTICE 'Referral activated: % (Referrer: %, Referred: %)', p_referral_id, v_referrer_id, v_referred_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION churn_referral(p_referral_id UUID)
RETURNS VOID AS $$
DECLARE
    v_referrer_id UUID;
    v_referral_status TEXT;
BEGIN
    SELECT referrer_customer_id, status
    INTO v_referrer_id, v_referral_status
    FROM referrals
    WHERE id = p_referral_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referral not found: %', p_referral_id;
    END IF;

    IF v_referral_status != 'active' THEN
        RAISE EXCEPTION 'Referral is not in active status: %', v_referral_status;
    END IF;

    UPDATE referrals
    SET status = 'churned', churned_at = NOW()
    WHERE id = p_referral_id;

    PERFORM update_referral_stats(v_referrer_id);

    RAISE NOTICE 'Referral churned: % (Referrer: %)', p_referral_id, v_referrer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 009: Stripe Integration
-- =====================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE customers ADD COLUMN stripe_customer_id TEXT UNIQUE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id
    ON customers(stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_subscription_status CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION get_customer_by_stripe_id(p_stripe_customer_id TEXT)
RETURNS TABLE (
    id UUID,
    auth_user_id UUID,
    email TEXT,
    name TEXT,
    business_name TEXT,
    signup_discount_percentage INTEGER,
    referral_discount_percentage INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.auth_user_id,
        c.email,
        c.name,
        c.business_name,
        c.signup_discount_percentage,
        c.referral_discount_percentage
    FROM customers c
    WHERE c.stripe_customer_id = p_stripe_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_active_subscription(p_customer_id UUID)
RETURNS TABLE (
    id UUID,
    stripe_subscription_id TEXT,
    plan_id TEXT,
    status TEXT,
    current_period_end TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.stripe_subscription_id,
        s.plan_id,
        s.status,
        s.current_period_end
    FROM subscriptions s
    WHERE s.customer_id = p_customer_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DONE!
-- =====================================================

SELECT 'Migration completed successfully! ✅' as result;
