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
