-- Migration: Add ever_connected field to devices table
-- This field tracks whether a device has ever successfully connected
-- Used to prevent auto-delete of devices that have been used before

USE wa_gateway;

-- Add ever_connected column if it doesn't exist
DROP PROCEDURE IF EXISTS AddEverConnectedToDevices;
DELIMITER //
CREATE PROCEDURE AddEverConnectedToDevices()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'devices' 
        AND COLUMN_NAME = 'ever_connected' 
        AND TABLE_SCHEMA = 'wa_gateway'
    ) THEN
        ALTER TABLE devices 
        ADD COLUMN ever_connected BOOLEAN DEFAULT FALSE AFTER status,
        ADD COLUMN last_connected_at TIMESTAMP NULL AFTER ever_connected;
        
        -- Mark existing devices with status 'connected' as ever_connected
        UPDATE devices SET ever_connected = TRUE WHERE status = 'connected';
        
        -- Also mark devices that have session data in wa_sessions
        UPDATE devices d
        SET d.ever_connected = TRUE
        WHERE EXISTS (
            SELECT 1 FROM wa_sessions ws 
            WHERE ws.id LIKE CONCAT(d.device_id, '%')
        );
    END IF;
END //
DELIMITER ;

CALL AddEverConnectedToDevices();
DROP PROCEDURE AddEverConnectedToDevices;
