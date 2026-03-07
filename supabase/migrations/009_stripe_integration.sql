-- Migration 009: Stripe Integration
-- Adds Stripe customer tracking and subscriptions table

-- Add Stripe customer ID to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Create index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id
    ON customers(stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_price_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_subscription_status CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing'))
);

-- Indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id
    ON subscriptions(customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id
    ON subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
    ON subscriptions(status)
    WHERE status = 'active';

-- Updated at trigger (drop if exists first)
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get customer by Stripe customer ID
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

-- Function to get active subscription for a customer
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
