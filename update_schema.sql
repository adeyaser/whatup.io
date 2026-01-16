USE wa_gateway;

-- Table to track added devices/sessions
CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'disconnected',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add device_id column to message_logs if it doesn't exist
-- Procedure to add column safely
DROP PROCEDURE IF EXISTS AddDeviceIdToLogs;
DELIMITER //
CREATE PROCEDURE AddDeviceIdToLogs()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'message_logs' AND COLUMN_NAME = 'device_id' AND TABLE_SCHEMA = 'wa_gateway'
    ) THEN
        ALTER TABLE message_logs ADD COLUMN device_id VARCHAR(50) AFTER id;
        ALTER TABLE message_logs ADD INDEX (device_id);
    END IF;
END //
DELIMITER ;
CALL AddDeviceIdToLogs();
DROP PROCEDURE AddDeviceIdToLogs;

-- Seed initial device if empty
INSERT INTO devices (device_id, name)
SELECT 'default', 'Main Device'
WHERE NOT EXISTS (SELECT * FROM devices);
