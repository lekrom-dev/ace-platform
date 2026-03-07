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
