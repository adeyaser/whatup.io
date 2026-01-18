const pino = require('pino');
const QRCode = require('qrcode');
const pool = require('../config/database');
const useMySQLAuthState = require('./authStore');
const { Boom } = require('@hapi/boom');
require('dotenv').config();

// Lazy load baileys module (ESM)
let baileysModule = null;
const getBaileys = async () => {
    if (!baileysModule) {
        baileysModule = await import('@whiskeysockets/baileys');
    }
    return baileysModule;
};

// Extract domain name from APP_URL untuk dynamic server name
const getDomainName = () => {
    try {
        const appUrl = process.env.APP_URL || 'localhost';
        const url = new URL(appUrl);
        const hostname = url.hostname;
        // Extract main domain (e.g., "galerilittlehomemontessori" dari "whatup.galerilittlehomemontessori.my.id")
        const parts = hostname.split('.');
        return parts.length > 0 ? parts[0] : 'WA-Gateway';
    } catch (error) {
        return 'WA-Gateway';
    }
};

// Map to store active sessions: deviceId -> socket instance
const sessions = new Map();
let io;

// Suppress libsignal MAC errors (suppress repetitive error logs)
const originalConsoleError = console.error;
console.error = function (...args) {
    const errorMsg = args[0]?.toString?.() || '';
    // Skip repetitive MAC/BAD_MAC errors
    if (errorMsg.includes('Bad MAC') || errorMsg.includes('Failed to decrypt message')) {
        return;
    }
    originalConsoleError.apply(console, args);
};

const initWhatsApp = async (socketIo) => {
    try {
        io = socketIo;

        // Load existing devices from DB and start them
        const [rows] = await pool.query('SELECT device_id FROM devices');
        for (const row of rows) {
            startSession(row.device_id).catch(err => {
                console.error(`Failed to start session for device ${row.device_id}:`, err);
            });
        }
    } catch (error) {
        console.error('Error initializing WhatsApp:', error);
        // Don't throw - allow app to continue even if initialization fails
    }
};

const startSession = async (deviceId) => {
    try {
        console.log(`Starting session for device: ${deviceId}`);

        // Load baileys module
        const baileys = await getBaileys();
        const makeWASocket = baileys.default;
        const { DisconnectReason, fetchLatestBaileysVersion } = baileys;

        // Pass deviceId to state handler to prefix keys
        const { state, saveCreds } = await useMySQLAuthState(deviceId);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: [getDomainName(), 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: true,
        });

        sessions.set(deviceId, sock);

        // Handle socket errors (Bad MAC, session corruption, etc)
        sock.ev.on('connection.error', (error) => {
            const errMsg = error?.message?.toString?.() || '';
            if (errMsg.includes('Bad MAC') || errMsg.includes('SESSION_')) {
                console.warn(`[${deviceId}] ⚠️ Session encryption error detected - attempting recovery`);
                // Trigger reconnect to fix session
                setTimeout(() => {
                    sock.end(undefined);
                    sessions.delete(deviceId);
                    startSession(deviceId).catch(e => console.error(`Recovery failed for ${deviceId}:`, e.message));
                }, 2000);
            }
        });

        sock.ev.on('connection.update', async (update) => {
            try {
                // Load baileys once for this handler
                const baileys = await getBaileys();
                const { DisconnectReason } = baileys;

                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    QRCode.toDataURL(qr, (err, url) => {
                        if (!err && io) {
                            io.emit(`qr_code:${deviceId}`, url);
                            console.log(`QR Code emitted for ${deviceId}`);
                        }
                    });
                    // Update status in DB
                    try {
                        await pool.query('UPDATE devices SET status = ? WHERE device_id = ?', ['scanning', deviceId]);
                        if (io) io.emit('device_status', { deviceId, status: 'scanning' });
                    } catch (err) {
                        console.error('Error updating device status:', err);
                    }
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log(`Connection closed for ${deviceId}. Reconnecting:`, shouldReconnect);

                    if (shouldReconnect) {
                        // Emit connecting status before restarting
                        if (io) io.emit('device_status', { deviceId, status: 'connecting' });
                        startSession(deviceId).catch(err => {
                            console.error(`Error reconnecting device ${deviceId}:`, err);
                        });
                    } else {
                        console.log(`Device ${deviceId} logged out.`);
                        try {
                            await pool.query('UPDATE devices SET status = ? WHERE device_id = ?', ['disconnected', deviceId]);
                            if (io) io.emit('device_status', { deviceId, status: 'disconnected' });
                        } catch (err) {
                            console.error('Error updating device status:', err);
                        }
                        // Clean up session data if needed
                        sessions.delete(deviceId);
                    }
                } else if (connection === 'open') {
                    console.log(`Opened connection for ${deviceId}`);
                    const user = sock.user;
                    try {
                        await pool.query('UPDATE devices SET status = ?, name = ? WHERE device_id = ?', ['connected', user?.name || user?.id || deviceId, deviceId]);
                        if (io) io.emit('device_status', { deviceId, status: 'connected', user });
                    } catch (err) {
                        console.error('Error updating device status:', err);
                    }
                } else if (connection === 'connecting') {
                    if (io) io.emit('device_status', { deviceId, status: 'connecting' });
                }
            } catch (error) {
                console.error(`Error in connection.update for device ${deviceId}:`, error);
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0];
                if (!msg.message || msg.key.fromMe) return;

                const remoteJid = msg.key.remoteJid;
                const messageType = Object.keys(msg.message)[0];
                const content = JSON.stringify(msg.message);

                // Extract text
                let text = '';
                if (messageType === 'conversation') text = msg.message.conversation;
                else if (messageType === 'extendedTextMessage') text = msg.message.extendedTextMessage.text;
                else if (messageType === 'imageMessage') text = '[Image] ' + (msg.message.imageMessage.caption || '');
                else if (messageType === 'videoMessage') text = '[Video] ' + (msg.message.videoMessage.caption || '');

                // No message logging - messages not saved to database
            } catch (error) {
                console.error(`Error in messages.upsert for device ${deviceId}:`, error);
            }
        });
    } catch (error) {
        console.error(`Error starting session for device ${deviceId}:`, error);
        throw error;
    }
};

const createDevice = async (deviceId, name = 'New Device') => {
    try {
        await pool.query('INSERT IGNORE INTO devices (device_id, name, status) VALUES (?, ?, ?)', [deviceId, name, 'disconnected']);
        startSession(deviceId);
        return true;
    } catch (e) {
        console.error('Error creating device:', e);
        return false;
    }
};

const deleteDevice = async (deviceId) => {
    try {
        const sock = sessions.get(deviceId);
        if (sock) {
            sock.end(undefined);
            sessions.delete(deviceId);
        }
        // Clean up DB (Auth store cleared via authStore logic if implemented, or manually)
        // For now, just remove from devices table
        await pool.query('DELETE FROM devices WHERE device_id = ?', [deviceId]);
        // Optionally clear sessions table
        await pool.query('DELETE FROM wa_sessions WHERE id LIKE ?', [`${deviceId}%`]);
        return true;
    } catch (e) {
        console.error('Error deleting device:', e);
        return false;
    }
};

const sendMessage = async (deviceId, to, type, content, caption = '') => {
    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    let sentMsg;

    try {
        const sock = sessions.get(deviceId);
        if (!sock) throw new Error(`Device ${deviceId} not found or not connected`);

        if (type === 'text') {
            sentMsg = await sock.sendMessage(jid, { text: content });
        } else if (type === 'image') {
            sentMsg = await sock.sendMessage(jid, { image: { url: content }, caption: caption });
        } else if (type === 'video') {
            sentMsg = await sock.sendMessage(jid, { video: { url: content }, caption: caption });
        }

        // Save success log
        const [result] = await pool.query(
            'INSERT INTO message_logs (remote_jid, direction, type, content, status, device_id, retry_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [jid, 'OUT', type, (type === 'text' ? content : `[${type}] ${caption}`), 'sent', deviceId, 0]
        );

        return { ...sentMsg, logId: result.insertId };
    } catch (error) {
        console.error('Send message error:', error);

        // Save failed log for retry
        try {
            await pool.query(
                'INSERT INTO message_logs (remote_jid, direction, type, content, status, device_id, retry_count, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [jid, 'OUT', type, (type === 'text' ? content : `[${type}] ${caption}`), 'failed', deviceId, 0, error.message]
            );
            console.log(`Failed message logged for retry: ${jid}`);
        } catch (logError) {
            console.error('Error logging failed message:', logError);
        }

        throw error;
    }
};

// Retry a failed message by log ID
const retryMessage = async (logId) => {
    try {
        // Get the failed message from DB
        const [rows] = await pool.query('SELECT * FROM message_logs WHERE id = ? AND status = ?', [logId, 'failed']);
        if (rows.length === 0) {
            throw new Error('Message not found or already sent');
        }

        const log = rows[0];
        const sock = sessions.get(log.device_id);
        if (!sock) throw new Error(`Device ${log.device_id} not connected`);

        // Parse content type
        const isMedia = log.type !== 'text';
        let sentMsg;

        if (log.type === 'text') {
            sentMsg = await sock.sendMessage(log.remote_jid, { text: log.content });
        } else {
            // For media, content format is "[type] caption" - extract URL from original
            // This is a limitation - for now just retry text messages reliably
            sentMsg = await sock.sendMessage(log.remote_jid, { text: log.content });
        }

        // Update status to sent
        await pool.query('UPDATE message_logs SET status = ?, retry_count = retry_count + 1 WHERE id = ?', ['sent', logId]);

        console.log(`Successfully retried message ${logId}`);
        return sentMsg;
    } catch (error) {
        // Increment retry count
        await pool.query('UPDATE message_logs SET retry_count = retry_count + 1, error_message = ? WHERE id = ?', [error.message, logId]);
        console.error(`Retry failed for message ${logId}:`, error.message);
        throw error;
    }
};

module.exports = { initWhatsApp, sendMessage, retryMessage, createDevice, deleteDevice, sessions };

