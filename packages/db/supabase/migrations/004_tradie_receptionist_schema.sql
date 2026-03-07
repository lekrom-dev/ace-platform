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
