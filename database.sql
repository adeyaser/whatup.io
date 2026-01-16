CREATE DATABASE IF NOT EXISTS wa_gateway;
USE wa_gateway;

-- Table for Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Baileys Session Storage
CREATE TABLE IF NOT EXISTS wa_sessions (
    id VARCHAR(128) PRIMARY KEY,
    data JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for Message Logs
CREATE TABLE IF NOT EXISTS message_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remote_jid VARCHAR(255) NOT NULL,
    direction ENUM('IN', 'OUT') NOT NULL,
    type ENUM('text', 'image', 'video', 'document', 'audio', 'sticker', 'other') DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert a default admin user (password: admin123 - in real app should be hashed)
INSERT INTO users (username, password, api_key) 
SELECT 'admin', 'admin123', 'wa-secret-key-123' 
WHERE NOT EXISTS (SELECT * FROM users WHERE username = 'admin');
