-- ACE Platform Core Schema
-- Migration 001: Initial database schema for prospects, customers, modules, subscriptions, interactions, and opportunities

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for status fields
CREATE TYPE prospect_status AS ENUM ('new', 'contacted', 'engaged', 'qualified', 'converted', 'lost', 'nurture');
CREATE TYPE customer_status AS ENUM ('active', 'churned', 'paused', 'suspended');
CREATE TYPE module_status AS ENUM ('development', 'active', 'sunset', 'retired');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'paused', 'suspended');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'annual', 'one_time');
CREATE TYPE interaction_channel AS ENUM ('email', 'sms', 'voice', 'chat', 'web', 'system');
CREATE TYPE opportunity_status AS ENUM ('backlog', 'concept', 'validation', 'greenlit', 'building', 'live', 'sunset');

-- ============================================================================
-- PROSPECTS TABLE
-- Potential customers identified by the engine
-- ============================================================================
CREATE TABLE prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    location_city TEXT,
    location_state TEXT,
    location_country TEXT DEFAULT 'AU',
    size_estimate TEXT,
    decision_maker_name TEXT,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    technology_stack JSONB DEFAULT '[]'::JSONB,
    pain_signals JSONB DEFAULT '[]'::JSONB,
    enrichment_data JSONB DEFAULT '{}'::JSONB,
    module_fit_scores JSONB DEFAULT '{}'::JSONB,
    overall_score INTEGER DEFAULT 0,
    status prospect_status DEFAULT 'new',
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CUSTOMERS TABLE
-- Paying users of the platform
-- ============================================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    company TEXT,
    status customer_status DEFAULT 'active',
    lifetime_value NUMERIC(10, 2) DEFAULT 0,
    health_score INTEGER DEFAULT 100,
    nps_score INTEGER,
    converted_from_prospect_id UUID REFERENCES prospects(id),
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MODULES TABLE
-- Product definitions (Contract Analysis, Tradie Receptionist, etc.)
-- ============================================================================
CREATE TABLE modules (
    id TEXT PRIMARY KEY, -- slug like 'contract-analysis'
    name TEXT NOT NULL,
    description TEXT,
    status module_status DEFAULT 'active',
    pricing_config JSONB NOT NULL,
    onboarding_config JSONB DEFAULT '{}'::JSONB,
    health_metrics JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- Links customers to modules with billing information
-- ============================================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL REFERENCES modules(id),
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    plan TEXT NOT NULL,
    billing_cycle billing_cycle DEFAULT 'monthly',
    status subscription_status DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (customer_id, module_id)
);

-- ============================================================================
-- INTERACTIONS TABLE
-- Every touchpoint with prospects and customers
-- ============================================================================
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('prospect', 'customer')),
    entity_id UUID NOT NULL,
    channel interaction_channel,
    interaction_type TEXT NOT NULL,
    content TEXT,
    outcome TEXT,
    sentiment_score NUMERIC(3, 2),
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- OPPORTUNITIES TABLE
-- Innovation Loop entities for new product ideas
-- ============================================================================
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    source_signals JSONB DEFAULT '[]'::JSONB,
    composite_score INTEGER DEFAULT 0,
    status opportunity_status DEFAULT 'backlog',
    concept_brief JSONB,
    validation_data JSONB,
    decision_log JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Prospects indexes
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospects_score ON prospects(overall_score DESC);
CREATE INDEX idx_prospects_email ON prospects(email);
CREATE INDEX idx_prospects_location ON prospects(location_country, location_state);
CREATE INDEX idx_prospects_created_at ON prospects(created_at DESC);

-- Customers indexes
CREATE INDEX idx_customers_auth_user_id ON customers(auth_user_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_created_at ON customers(created_at DESC);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_module_id ON subscriptions(module_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Interactions indexes
CREATE INDEX idx_interactions_entity ON interactions(entity_type, entity_id);
CREATE INDEX idx_interactions_created_at ON interactions(created_at DESC);
CREATE INDEX idx_interactions_type ON interactions(interaction_type);

-- Opportunities indexes
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_score ON opportunities(composite_score DESC);

-- ============================================================================
-- TRIGGERS
-- Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prospects_updated_at
    BEFORE UPDATE ON prospects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- Insert the two initial modules
-- ============================================================================

INSERT INTO modules (id, name, description, pricing_config) VALUES
(
    'contract-analysis',
    'Contract Analysis & Negotiation Coaching',
    'AI-powered contract review with risk analysis and negotiation guidance',
    '{
        "free_tier": {
            "name": "Basic Report",
            "price": 0,
            "features": ["Contract Clarity Report", "Negotiation Playbook"]
        },
        "premium": {
            "vm": {
                "name": "Value Maximisation Blueprint",
                "price": 4900,
                "currency": "AUD",
                "type": "one_time"
            },
            "jd": {
                "name": "Jurisdiction Deep-Dive",
                "price": 7900,
                "currency": "AUD",
                "type": "one_time"
            }
        }
    }'::JSONB
),
(
    'tradie-receptionist',
    'AI Receptionist for Tradespeople',
    'Never miss a call again with your AI-powered receptionist that books jobs 24/7',
    '{
        "tiers": {
            "starter": {
                "name": "Starter",
                "price": 9900,
                "currency": "AUD",
                "billing": "monthly",
                "features": ["50 calls/month", "Basic booking", "SMS notifications"]
            },
            "professional": {
                "name": "Professional",
                "price": 13900,
                "currency": "AUD",
                "billing": "monthly",
                "features": ["150 calls/month", "Calendar integration", "Call analytics"]
            },
            "premium": {
                "name": "Premium",
                "price": 17900,
                "currency": "AUD",
                "billing": "monthly",
                "features": ["Unlimited calls", "Priority support", "Custom integrations"]
            }
        }
    }'::JSONB
);

-- ============================================================================
-- COMMENTS
-- Document the schema
-- ============================================================================

COMMENT ON TABLE prospects IS 'Potential customers identified through outreach and discovery';
COMMENT ON TABLE customers IS 'Authenticated users with active or past subscriptions';
COMMENT ON TABLE modules IS 'Product definitions and configurations';
COMMENT ON TABLE subscriptions IS 'Customer subscriptions to modules with billing details';
COMMENT ON TABLE interactions IS 'Timeline of all touchpoints with prospects and customers';
COMMENT ON TABLE opportunities IS 'Innovation loop tracking for new product ideas';

COMMENT ON COLUMN prospects.enrichment_data IS 'Third-party data from enrichment APIs (confidence scores, sources)';
COMMENT ON COLUMN prospects.module_fit_scores IS 'AI-calculated fit scores per module';
COMMENT ON COLUMN customers.health_score IS 'Customer health score (0-100)';
COMMENT ON COLUMN customers.metadata IS 'Flexible storage for customer-specific data';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID for billing';
COMMENT ON COLUMN interactions.sentiment_score IS 'AI-calculated sentiment (-1 to 1)';
