-- Migration: Add retry columns to message_logs table
-- Run this SQL to add support for message retry tracking

ALTER TABLE message_logs 
ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT NULL;

-- Update existing records
UPDATE message_logs SET retry_count = 0 WHERE retry_count IS NULL;
