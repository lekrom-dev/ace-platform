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
