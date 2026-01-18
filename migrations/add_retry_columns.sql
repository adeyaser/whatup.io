-- Migration: Add retry columns to message_logs table
-- Run this SQL to add support for message retry tracking
-- Note: Run these one at a time if you get errors

ALTER TABLE message_logs ADD COLUMN retry_count INT DEFAULT 0;
ALTER TABLE message_logs ADD COLUMN error_message TEXT NULL;

-- Update existing records
UPDATE message_logs SET retry_count = 0 WHERE retry_count IS NULL;
