-- ACE Platform - Complete Database Setup
-- Apply this in Supabase SQL Editor
-- =====================================================


-- =====================================================
-- 001_core_schema.sql
-- =====================================================

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


-- =====================================================
-- 002_rls_policies.sql
-- =====================================================

-- ACE Platform Row Level Security Policies
-- Migration 002: Enable RLS and define access policies for all tables

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CUSTOMERS TABLE POLICIES
-- Users can only access their own customer record
-- ============================================================================

-- SELECT: Authenticated users can read their own record
CREATE POLICY "Users can read their own customer record"
    ON customers
    FOR SELECT
    TO authenticated
    USING (auth.uid() = auth_user_id);

-- UPDATE: Authenticated users can update their own record
CREATE POLICY "Users can update their own customer record"
    ON customers
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

-- INSERT: Service role only (engine creates customers programmatically)
CREATE POLICY "Service role can insert customers"
    ON customers
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- DELETE: Service role only
CREATE POLICY "Service role can delete customers"
    ON customers
    FOR DELETE
    TO service_role
    USING (true);

-- ============================================================================
-- SUBSCRIPTIONS TABLE POLICIES
-- Users can see subscriptions linked to their customer record
-- ============================================================================

-- SELECT: Users can see their own subscriptions
CREATE POLICY "Users can read their own subscriptions"
    ON subscriptions
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
    );

-- INSERT/UPDATE/DELETE: Service role only
CREATE POLICY "Service role can insert subscriptions"
    ON subscriptions
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update subscriptions"
    ON subscriptions
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can delete subscriptions"
    ON subscriptions
    FOR DELETE
    TO service_role
    USING (true);

-- ============================================================================
-- INTERACTIONS TABLE POLICIES
-- Users can see interactions linked to their customer record
-- ============================================================================

-- SELECT: Users can see interactions for their customer record
CREATE POLICY "Users can read their own interactions"
    ON interactions
    FOR SELECT
    TO authenticated
    USING (
        entity_type = 'customer' AND
        entity_id IN (
            SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
    );

-- INSERT/UPDATE/DELETE: Service role only
CREATE POLICY "Service role can insert interactions"
    ON interactions
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update interactions"
    ON interactions
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can delete interactions"
    ON interactions
    FOR DELETE
    TO service_role
    USING (true);

-- ============================================================================
-- MODULES TABLE POLICIES
-- Modules are public metadata - anyone can read
-- ============================================================================

-- SELECT: Anyone can read modules (public product information)
CREATE POLICY "Anyone can read modules"
    ON modules
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- INSERT/UPDATE/DELETE: Service role only
CREATE POLICY "Service role can manage modules"
    ON modules
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- PROSPECTS TABLE POLICIES
-- Internal engine data - service role only
-- ============================================================================

-- All operations: Service role only
CREATE POLICY "Service role has full access to prospects"
    ON prospects
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- OPPORTUNITIES TABLE POLICIES
-- Internal Innovation Loop data - service role only
-- ============================================================================

-- All operations: Service role only
CREATE POLICY "Service role has full access to opportunities"
    ON opportunities
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can read their own customer record" ON customers IS
    'Authenticated users can only SELECT their own customer record via auth.uid()';

COMMENT ON POLICY "Users can read their own subscriptions" ON subscriptions IS
    'Users can view subscriptions where customer_id matches their customer record';

COMMENT ON POLICY "Users can read their own interactions" ON interactions IS
    'Users can view interactions linked to their customer record';

COMMENT ON POLICY "Anyone can read modules" ON modules IS
    'Modules are public product metadata visible to all users';

COMMENT ON POLICY "Service role has full access to prospects" ON prospects IS
    'Prospects are internal engine data, never exposed to end-users';

COMMENT ON POLICY "Service role has full access to opportunities" ON opportunities IS
    'Opportunities are internal Innovation Loop data for product development';


-- =====================================================
-- 003_auth_trigger.sql
-- =====================================================

-- ============================================================================
-- MIGRATION 003: Auth-to-Customer Trigger
-- ============================================================================
-- Automatically creates a customer record when a user confirms their email
-- Pulls metadata (full_name, business_name) from Supabase Auth signup

-- Drop trigger and function if they exist (for re-running migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new customer record
  INSERT INTO public.customers (
    auth_user_id,
    email,
    name,
    company,
    status,
    lifetime_value,
    health_score,
    metadata
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'business_name',
    'active',
    0.0,
    100,
    jsonb_build_object(
      'signup_source', 'auth_signup',
      'created_at', NEW.created_at,
      'confirmed_at', NEW.confirmed_at
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
-- Fires AFTER INSERT on auth.users (when user confirms email)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;


-- =====================================================
-- 004_tradie_receptionist_schema.sql
-- =====================================================

-- Migration: Tradie Receptionist Module Schema
-- Description: Tables for AI voice receptionist functionality with Retell AI integration
-- Module: tradie-receptionist

-- ============================================================================
-- TRADIE CONFIGURATIONS
-- ============================================================================
-- Stores business details, hours, greeting scripts, and phone numbers for each tradie

CREATE TABLE IF NOT EXISTS tradie_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- Business Details
    business_name TEXT NOT NULL,
    trade_type TEXT NOT NULL, -- e.g., 'plumber', 'electrician', 'carpenter'
    service_area TEXT, -- e.g., 'Sydney Northern Beaches', 'Melbourne CBD'

    -- Phone Numbers (Twilio)
    phone_number TEXT UNIQUE, -- Australian number from Twilio (+614...)
    forwarding_number TEXT, -- Where to forward calls/emergencies
    sms_notifications_enabled BOOLEAN DEFAULT true,

    -- Retell AI Multi-Workspace Configuration
    -- Each tradie gets their own isolated Retell workspace for better organization and billing
    retell_workspace_id TEXT, -- Dedicated Retell workspace ID for this tradie
    retell_api_key TEXT, -- Encrypted API key for workspace access
    retell_agent_id TEXT, -- Retell AI agent ID within the workspace
    retell_phone_id TEXT, -- Retell phone number ID within the workspace
    greeting_script TEXT DEFAULT 'G''day! Thanks for calling. I''m the AI assistant. How can I help you today?',

    -- Business Hours (JSON array of schedules)
    business_hours JSONB DEFAULT '[
        {"day": "monday", "open": "07:00", "close": "17:00", "enabled": true},
        {"day": "tuesday", "open": "07:00", "close": "17:00", "enabled": true},
        {"day": "wednesday", "open": "07:00", "close": "17:00", "enabled": true},
        {"day": "thursday", "open": "07:00", "close": "17:00", "enabled": true},
        {"day": "friday", "open": "07:00", "close": "17:00", "enabled": true},
        {"day": "saturday", "open": "08:00", "close": "12:00", "enabled": true},
        {"day": "sunday", "open": "00:00", "close": "00:00", "enabled": false}
    ]'::JSONB,

    -- Google Calendar Integration
    google_calendar_connected BOOLEAN DEFAULT false,
    google_calendar_id TEXT,
    google_refresh_token TEXT, -- Encrypted in production

    -- Booking Configuration
    default_job_duration_minutes INTEGER DEFAULT 60,
    booking_buffer_minutes INTEGER DEFAULT 15, -- Time between jobs
    advance_booking_days INTEGER DEFAULT 14, -- How far ahead to allow bookings

    -- Module Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lookups
CREATE INDEX idx_tradie_configs_customer_id ON tradie_configs(customer_id);
CREATE INDEX idx_tradie_configs_phone_number ON tradie_configs(phone_number);
CREATE INDEX idx_tradie_configs_retell_workspace_id ON tradie_configs(retell_workspace_id);
CREATE INDEX idx_tradie_configs_retell_agent_id ON tradie_configs(retell_agent_id);

-- ============================================================================
-- CALL LOGS
-- ============================================================================
-- Stores all calls handled by Retell AI with transcripts and outcomes

CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tradie_config_id UUID NOT NULL REFERENCES tradie_configs(id) ON DELETE CASCADE,

    -- Retell Call Details
    retell_call_id TEXT UNIQUE NOT NULL, -- Retell's call ID
    call_status TEXT NOT NULL, -- 'in_progress', 'completed', 'failed', 'no_answer'

    -- Caller Information
    caller_phone TEXT NOT NULL,
    caller_name TEXT,

    -- Call Timing
    call_started_at TIMESTAMPTZ,
    call_ended_at TIMESTAMPTZ,
    duration_seconds INTEGER, -- Calculated from start/end

    -- Call Transcript & Analysis
    transcript TEXT, -- Full conversation transcript
    summary TEXT, -- AI-generated summary of the call
    sentiment TEXT, -- 'positive', 'neutral', 'negative'

    -- Call Outcome
    outcome_type TEXT NOT NULL, -- 'booking_created', 'callback_requested', 'emergency_transfer', 'information_only', 'voicemail', 'hung_up'

    -- Booking Details (if outcome_type = 'booking_created')
    booking_data JSONB, -- {date, time, service_type, description, customer_details}
    google_calendar_event_id TEXT, -- Reference to Google Calendar event

    -- Callback Details (if outcome_type = 'callback_requested')
    callback_requested_for TIMESTAMPTZ,
    callback_notes TEXT,
    callback_completed BOOLEAN DEFAULT false,

    -- Emergency Details (if outcome_type = 'emergency_transfer')
    emergency_transferred_to TEXT,
    emergency_transferred_at TIMESTAMPTZ,
    emergency_notes TEXT,

    -- Recording & Artifacts
    recording_url TEXT, -- Retell recording URL

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB, -- Additional data from Retell webhooks

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_call_logs_customer_id ON call_logs(customer_id);
CREATE INDEX idx_call_logs_tradie_config_id ON call_logs(tradie_config_id);
CREATE INDEX idx_call_logs_retell_call_id ON call_logs(retell_call_id);
CREATE INDEX idx_call_logs_call_started_at ON call_logs(call_started_at DESC);
CREATE INDEX idx_call_logs_outcome_type ON call_logs(outcome_type);
CREATE INDEX idx_call_logs_caller_phone ON call_logs(caller_phone);

-- ============================================================================
-- CALL ACTIONS
-- ============================================================================
-- Tracks actions taken during calls (custom function invocations)

CREATE TABLE IF NOT EXISTS call_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,

    -- Action Details
    action_type TEXT NOT NULL, -- 'booking_capture', 'callback_request', 'emergency_transfer'
    action_timestamp TIMESTAMPTZ DEFAULT NOW(),

    -- Action Parameters
    parameters JSONB NOT NULL, -- Function parameters from Retell

    -- Action Result
    result_status TEXT NOT NULL, -- 'success', 'failed', 'pending'
    result_data JSONB, -- Response data
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for call lookups
CREATE INDEX idx_call_actions_call_log_id ON call_actions(call_log_id);
CREATE INDEX idx_call_actions_action_type ON call_actions(action_type);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tradie_configs_updated_at
    BEFORE UPDATE ON tradie_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_logs_updated_at
    BEFORE UPDATE ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE tradie_configs IS 'Configuration for each tradie''s AI receptionist. Uses Retell multi-workspace architecture where each tradie gets their own isolated workspace with dedicated billing, phone numbers, and agents';
COMMENT ON TABLE call_logs IS 'Log of all calls handled by the AI receptionist with transcripts, outcomes, and booking details';
COMMENT ON TABLE call_actions IS 'Individual actions taken during calls (bookings, callbacks, transfers) via Retell custom functions';

COMMENT ON COLUMN tradie_configs.retell_workspace_id IS 'Dedicated Retell workspace ID for this tradie. Multi-workspace approach provides isolation, simplified billing, and better scalability';
COMMENT ON COLUMN tradie_configs.retell_api_key IS 'Encrypted API key for accessing this tradie''s Retell workspace. Must be encrypted at rest using Supabase Vault or similar';
COMMENT ON COLUMN tradie_configs.business_hours IS 'JSON array of daily schedules with open/close times in HH:MM format';
COMMENT ON COLUMN tradie_configs.google_refresh_token IS 'OAuth refresh token for Google Calendar API (should be encrypted)';
COMMENT ON COLUMN call_logs.booking_data IS 'Structured booking information: {date, time, service_type, description, customer_details}';
COMMENT ON COLUMN call_logs.metadata IS 'Raw webhook data from Retell for debugging and analytics';


-- =====================================================
-- 005_add_emergency_number.sql
-- =====================================================

-- Migration: Add emergency number support
-- Description: Adds optional emergency number field for direct transfer during urgent calls

ALTER TABLE tradie_configs
ADD COLUMN IF NOT EXISTS emergency_number TEXT;

COMMENT ON COLUMN tradie_configs.emergency_number IS 'Optional separate emergency number for direct call transfer. If not set, emergencies trigger SMS alerts only.';


-- =====================================================
-- 006_referral_system.sql
-- =====================================================

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


-- =====================================================
-- 007_referral_invitations.sql
-- =====================================================

-- Migration 007: Referral Invitations (SMS Tracking)
-- Tracks SMS invitations sent to potential referrals

CREATE TABLE IF NOT EXISTS referral_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    sms_message TEXT NOT NULL,
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

-- Index for efficiently finding pending invitations
CREATE INDEX IF NOT EXISTS idx_referral_invitations_status_scheduled
    ON referral_invitations(status, scheduled_sms_at)
    WHERE status = 'scheduled';

-- Index for customer lookups
CREATE INDEX IF NOT EXISTS idx_referral_invitations_customer_id
    ON referral_invitations(customer_id);

-- Drop existing function if it exists (may have different signature)
DROP FUNCTION IF EXISTS get_pending_referral_invitations();

-- Function to get pending referral invitations ready to send
CREATE FUNCTION get_pending_referral_invitations()
RETURNS TABLE (
    id UUID,
    customer_id UUID,
    phone_number TEXT,
    sms_message TEXT,
    scheduled_sms_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ri.id,
        ri.customer_id,
        ri.phone_number,
        ri.sms_message,
        ri.scheduled_sms_at
    FROM referral_invitations ri
    WHERE ri.status = 'scheduled'
      AND ri.scheduled_sms_at <= NOW()
    ORDER BY ri.scheduled_sms_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated at trigger
CREATE TRIGGER update_referral_invitations_updated_at
    BEFORE UPDATE ON referral_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 008_signup_discount.sql
-- =====================================================

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


-- =====================================================
-- 009_stripe_integration.sql
-- =====================================================

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


-- =====================================================
-- 010_tradie_configs_columns.sql
-- =====================================================

-- Migration: Add business_hours and emergency_handling to tradie_configs
-- Created: 2026-03-03

-- Add business_hours JSONB column to store operating hours
ALTER TABLE tradie_configs
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{
  "monday": {"open": "07:00", "close": "17:00", "enabled": true},
  "tuesday": {"open": "07:00", "close": "17:00", "enabled": true},
  "wednesday": {"open": "07:00", "close": "17:00", "enabled": true},
  "thursday": {"open": "07:00", "close": "17:00", "enabled": true},
  "friday": {"open": "07:00", "close": "17:00", "enabled": true},
  "saturday": {"open": "08:00", "close": "12:00", "enabled": true},
  "sunday": {"open": null, "close": null, "enabled": false}
}'::jsonb;

-- Add emergency_handling JSONB column to store emergency call configuration
ALTER TABLE tradie_configs
ADD COLUMN IF NOT EXISTS emergency_handling JSONB DEFAULT '{
  "enabled": true,
  "notify_via_sms": true
}'::jsonb;

-- Add comment to document columns
COMMENT ON COLUMN tradie_configs.business_hours IS 'Business operating hours for each day of the week';
COMMENT ON COLUMN tradie_configs.emergency_handling IS 'Emergency call handling configuration';


-- =====================================================
-- 011_tradie_configs_nullable.sql
-- =====================================================

-- Migration: Make tradie_configs configuration columns nullable
-- Created: 2026-03-03
-- These are configuration fields that can be set later, not required at provisioning time

-- Make trade_type nullable (can be set in settings)
ALTER TABLE tradie_configs
ALTER COLUMN trade_type DROP NOT NULL;

-- Make business_name nullable with default fallback to customer name
ALTER TABLE tradie_configs
ALTER COLUMN business_name DROP NOT NULL;

-- Add comment
COMMENT ON TABLE tradie_configs IS 'AI Receptionist configuration for tradie businesses. Most fields are optional and can be configured after initial provisioning.';


-- =====================================================
-- 012_customer_location.sql
-- =====================================================

-- Migration: Add location fields for phone number provisioning
-- Created: 2026-03-03

-- Add country and region/state for localized phone number provisioning
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'AU',
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add index for location queries
CREATE INDEX IF NOT EXISTS idx_customers_country ON customers(country);

-- Add comments
COMMENT ON COLUMN customers.country IS 'ISO country code (e.g., AU, US, GB) for phone number provisioning';
COMMENT ON COLUMN customers.state IS 'State/province (e.g., NSW, VIC, QLD) for local number provisioning';
COMMENT ON COLUMN customers.city IS 'City for local number provisioning';

