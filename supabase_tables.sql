-- Add dynamic_variables column to existing contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dynamic_variables JSONB DEFAULT NULL;