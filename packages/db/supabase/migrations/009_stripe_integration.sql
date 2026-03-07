-- Migration: Stripe Integration
-- Description: Add Stripe customer ID and subscription tracking

-- ============================================================================
-- UPDATE CUSTOMERS TABLE
-- ============================================================================

-- Add Stripe customer ID
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Add index
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id ON customers(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ============================================================================
-- SUBSCRIPTIONS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Customer relationship
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- Module
    module_id TEXT NOT NULL, -- 'tradie-receptionist', etc.

    -- Stripe details
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_price_id TEXT NOT NULL,

    -- Status
    status TEXT NOT NULL, -- active, past_due, cancelled, etc.

    -- Billing period
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,

    -- Timestamps
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_module ON subscriptions(module_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN customers.stripe_customer_id IS 'Stripe customer ID for billing and subscriptions';

COMMENT ON TABLE subscriptions IS 'Tracks customer subscriptions for all modules (tradie-receptionist, etc.)';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, past_due, cancelled, trialing, incomplete, incomplete_expired, unpaid';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'If true, subscription will cancel at the end of the current period';
