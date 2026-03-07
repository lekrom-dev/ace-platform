-- Add address fields to customers table for Twilio regulatory compliance
-- These are required for provisioning Australian phone numbers

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS postcode TEXT,
ADD COLUMN IF NOT EXISTS twilio_address_sid TEXT;

-- Add comment for documentation
COMMENT ON COLUMN customers.street_address IS 'Street address for regulatory compliance (required for AU phone numbers)';
COMMENT ON COLUMN customers.postcode IS 'Postal code for regulatory compliance';
COMMENT ON COLUMN customers.twilio_address_sid IS 'Twilio Address SID for phone number provisioning';
