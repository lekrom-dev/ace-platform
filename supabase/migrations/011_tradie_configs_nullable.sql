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
