-- Migration: Referral Invitations
-- Description: Track SMS and call invitations sent to potential referrals

-- ============================================================================
-- REFERRAL INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who sent the invitation
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,

    -- Who is being invited
    phone_number TEXT NOT NULL,

    -- Message content
    sms_message TEXT NOT NULL,

    -- Scheduling
    scheduled_sms_at TIMESTAMPTZ NOT NULL,
    scheduled_call_at TIMESTAMPTZ, -- Follow-up call (24 hours after SMS)

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, sms_sent, call_made, signed_up, failed

    -- Delivery tracking
    sms_sent_at TIMESTAMPTZ,
    sms_sid TEXT, -- Twilio SMS ID
    call_made_at TIMESTAMPTZ,
    call_sid TEXT, -- Twilio/Retell Call ID

    -- Results
    signed_up_at TIMESTAMPTZ,
    error_message TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate invitations to same number within 30 days
    UNIQUE(customer_id, phone_number, scheduled_sms_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_invitations_customer ON referral_invitations(customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_invitations_status ON referral_invitations(status);
CREATE INDEX IF NOT EXISTS idx_referral_invitations_scheduled_sms ON referral_invitations(scheduled_sms_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_referral_invitations_phone ON referral_invitations(phone_number);

-- ============================================================================
-- FUNCTION: Process scheduled invitations
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_referral_invitations()
RETURNS TABLE (
    invitation_id UUID,
    customer_id UUID,
    customer_name TEXT,
    phone_number TEXT,
    sms_message TEXT,
    referral_code TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ri.id,
        ri.customer_id,
        c.name,
        ri.phone_number,
        ri.sms_message,
        ri.referral_code
    FROM referral_invitations ri
    INNER JOIN customers c ON c.id = ri.customer_id
    WHERE ri.status = 'scheduled'
      AND ri.scheduled_sms_at <= NOW()
    ORDER BY ri.scheduled_sms_at ASC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE referral_invitations IS 'Tracks SMS and call invitations sent to potential referrals';

COMMENT ON COLUMN referral_invitations.status IS 'Status: scheduled (pending), sms_sent (SMS delivered), call_made (follow-up call completed), signed_up (converted to customer), failed (delivery error)';
COMMENT ON COLUMN referral_invitations.scheduled_sms_at IS 'When to send the initial SMS invitation';
COMMENT ON COLUMN referral_invitations.scheduled_call_at IS 'When to make the follow-up call (typically 24h after SMS)';
COMMENT ON COLUMN referral_invitations.sms_sid IS 'Twilio SMS message SID for tracking';
COMMENT ON COLUMN referral_invitations.call_sid IS 'Twilio/Retell call SID for tracking';
