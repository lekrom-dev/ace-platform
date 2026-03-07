-- Migration: Add emergency number support
-- Description: Adds optional emergency number field for direct transfer during urgent calls

ALTER TABLE tradie_configs
ADD COLUMN IF NOT EXISTS emergency_number TEXT;

COMMENT ON COLUMN tradie_configs.emergency_number IS 'Optional separate emergency number for direct call transfer. If not set, emergencies trigger SMS alerts only.';
