-- Migration: Create scheduler_settings table
-- Run this SQL to add scheduler configuration support

CREATE TABLE IF NOT EXISTS scheduler_settings (
    id INT PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN DEFAULT TRUE,
    batch_size INT DEFAULT 5 COMMENT 'Max messages per batch',
    interval_minutes INT DEFAULT 30 COMMENT 'Interval between retry cycles',
    min_delay_seconds INT DEFAULT 30 COMMENT 'Min delay between messages',
    max_delay_seconds INT DEFAULT 60 COMMENT 'Max delay between messages',
    max_retries INT DEFAULT 3 COMMENT 'Max retry attempts per message',
    cooldown_minutes INT DEFAULT 5 COMMENT 'Only retry messages older than this',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings (only one row allowed)
INSERT INTO scheduler_settings (id, enabled, batch_size, interval_minutes, min_delay_seconds, max_delay_seconds, max_retries, cooldown_minutes)
VALUES (1, TRUE, 5, 30, 30, 60, 3, 5)
ON DUPLICATE KEY UPDATE id = id;
