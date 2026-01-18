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

// Cache for domain name and Baileys version
let cachedDomain = null;
const getDomainName = () => {
    if (cachedDomain) return cachedDomain;
    try {
        const appUrl = process.env.APP_URL || 'localhost';
        const url = new URL(appUrl);
        const hostname = url.hostname;
        const parts = hostname.split('.');
        cachedDomain = parts.length > 0 ? parts[0] : 'WA-Gateway';
        return cachedDomain;
    } catch (error) {
        return 'WA-Gateway';
    }
};

let cachedBAVersion = null;
const getWAVersion = async (fetchLatestBaileysVersion) => {
    if (cachedBAVersion) return cachedBAVersion;
    try {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        cachedBAVersion = version;
        console.log(`[System] Fetched latest WA version: v${version.join('.')}, isLatest: ${isLatest}`);
        return version;
    } catch (error) {
        // Fallback to a hardcoded recent version if fetch fails
        return [2, 3000, 1015901307];
    }
};

// Map to store active sessions: deviceId -> socket instance
const sessions = new Map();
const pendingSessions = new Set(); // Track devices currently initiating
const reconnectAttempts = new Map(); // Track reconnection attempts for backoff
const reconnectingSessions = new Set(); // Track devices currently waiting to reconnect
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
        // Prevent duplicate sessions for the same deviceId
        const existingSession = sessions.get(deviceId);
        if (existingSession) {
            const wsState = existingSession.ws?.readyState;
            // If session exists and is OPEN (1) or CONNECTING (0), don't start a new one
            if (wsState === 1 || wsState === 0) {
                console.log(`[${deviceId}] Session already exists and is ${wsState === 1 ? 'OPEN' : 'CONNECTING'}, skipping.`);
                return existingSession;
            }
            // If it's CLOSING (2) or CLOSED (3), clean it up and continue
            console.log(`[${deviceId}] Session exists but is in state ${wsState}, restarting...`);
            try {
                existingSession.end(undefined);
                existingSession.ev.removeAllListeners();
            } catch (e) { }
            sessions.delete(deviceId);
        }

        // Prevent concurrent initiation
        if (pendingSessions.has(deviceId)) {
            console.log(`[${deviceId}] Session initiation already in progress for ${deviceId}, skipping.`);
            return;
        }

        pendingSessions.add(deviceId);
        console.log(`[${deviceId}] Starting session...`);

        // Load baileys module
        const baileys = await getBaileys();
        const makeWASocket = baileys.default;
        const { DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = baileys;

        // Pass deviceId to state handler to prefix keys
        const { state, saveCreds } = await useMySQLAuthState(deviceId);

        // Use cached version to speed up startup
        const version = await getWAVersion(fetchLatestBaileysVersion);

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            browser: [getDomainName(), 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
            shouldIgnoreJid: jid => jid.includes('@broadcast'),
            connectTimeoutMs: 30000, // Reduced from 60s for faster failure/retry cycle
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            retryRequestDelayMs: 250 // Faster retries for internal requests
        });

        sessions.set(deviceId, sock);
        pendingSessions.delete(deviceId);


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
                    const statusCode = (lastDisconnect?.error instanceof Boom)?.output?.statusCode || lastDisconnect?.error?.output?.statusCode;
                    const reason = lastDisconnect?.error?.message || 'unknown';

                    const isConflict = statusCode === 440 || statusCode === DisconnectReason.connectionReplaced;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    if (sock) {
                        sock.isReady = false;
                        sock.ev.removeAllListeners(); // Prevent old callbacks
                    }

                    console.log(`[${deviceId}] ❌ Connection closed. Status: ${statusCode}, Reason: ${reason}. Reconnecting: ${shouldReconnect}`);

                    // Remove from active sessions
                    sessions.delete(deviceId);

                    if (shouldReconnect) {
                        // Mark as reconnecting (this prevents 'Device not found' in sendMessage)
                        reconnectingSessions.add(deviceId);

                        // Track attempts specifically for backoff
                        const attempts = (reconnectAttempts.get(deviceId) || 0) + 1;
                        reconnectAttempts.set(deviceId, attempts);

                        // Emit status
                        if (io) io.emit('device_status', { deviceId, status: 'connecting' });

                        // Exponential Backoff Logic: Wait 30s, 60s, 120s, up to 300s for conflicts
                        let delay = isConflict ? Math.min(30000 * Math.pow(2, attempts - 1), 300000) : Math.min(5000 * Math.pow(2, attempts - 1), 60000);

                        // Add jitter to prevent synchronization (0-10s)
                        delay += Math.floor(Math.random() * 10000);

                        console.log(`[${deviceId}] 🕒 Conflict: ${isConflict}. Attempt ${attempts}. Waiting ${Math.round(delay / 1000)}s...`);

                        setTimeout(async () => {
                            reconnectingSessions.delete(deviceId);

                            // Absolute safeguard: Check if device still exists in DB before reconnecting
                            try {
                                const [rows] = await pool.query('SELECT device_id FROM devices WHERE device_id = ?', [deviceId]);
                                if (rows.length === 0) {
                                    console.log(`[${deviceId}] 🛑 Device deleted from database, stopping reconnection loop.`);
                                    reconnectAttempts.delete(deviceId);
                                    return;
                                }
                            } catch (dbErr) {
                                console.error(`[${deviceId}] DB check failed during reconnect:`, dbErr.message);
                            }

                            if (!sessions.has(deviceId)) {
                                console.log(`[${deviceId}] 🔄 Reconnecting...`);
                                startSession(deviceId).catch(err => console.error(`[${deviceId}] Reconnect error:`, err.message));
                            }
                        }, delay);
                    } else {
                        reconnectingSessions.delete(deviceId);
                        reconnectAttempts.delete(deviceId);
                        console.log(`[${deviceId}] 🚪 Logged out. Cleaning up session.`);
                        try {
                            await pool.query('UPDATE devices SET status = ? WHERE device_id = ?', ['disconnected', deviceId]);
                            if (io) io.emit('device_status', { deviceId, status: 'disconnected' });
                            await pool.query('DELETE FROM wa_sessions WHERE id LIKE ?', [`${deviceId}_%`]);
                        } catch (err) {
                            console.error('Error updating logout status:', err);
                        }
                    }
                }
                else if (connection === 'open') {
                    console.log(`[${deviceId}] ✅ Connection opened`);
                    reconnectAttempts.delete(deviceId); // Reset backoff on success
                    sock.isReady = true; // Mark as ready for sending
                    const user = sock.user;
                    try {
                        // Only update status, preserve the name user input during creation
                        await pool.query('UPDATE devices SET status = ? WHERE device_id = ?', ['connected', deviceId]);
                        if (io) io.emit('device_status', { deviceId, status: 'connected', user });
                    } catch (err) {
                        console.error('Error updating device status:', err);
                    }
                } else if (connection === 'connecting') {
                    console.log(`[${deviceId}] ⏳ Connecting...`);
                    sock.isReady = false;
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
        pendingSessions.delete(deviceId);
        console.error(`Error starting session for device ${deviceId}:`, error);
        throw error;
    }
};

const createDevice = async (deviceId, name = 'New Device') => {
    try {
        await pool.query(
            'INSERT INTO devices (device_id, name, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = ?',
            [deviceId, name, 'disconnected', name]
        );
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
            sock.ev.removeAllListeners();
            sock.end(undefined);
            sessions.delete(deviceId);
        }

        // Thorough state cleanup
        reconnectAttempts.delete(deviceId);
        reconnectingSessions.delete(deviceId);
        pendingSessions.delete(deviceId);

        // Clean up DB
        await pool.query('DELETE FROM devices WHERE device_id = ?', [deviceId]);
        await pool.query('DELETE FROM wa_sessions WHERE id LIKE ?', [`${deviceId}%`]);

        console.log(`[${deviceId}] 🗑️ Device and all session states deleted.`);
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
        // Wait up to 10 seconds if the device is currently in a reconnection backoff period
        let reconnectWait = 0;
        while (reconnectingSessions.has(deviceId) && reconnectWait < 10) {
            if (reconnectWait === 0) console.log(`[${deviceId}] Device is currently reconnecting (backoff), waiting...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            reconnectWait++;
        }

        const sock = sessions.get(deviceId);

        // If still no socket after wait, then error
        if (!sock) {
            throw new Error(`Device ${deviceId} not found. Please add or restart the device.`);
        }

        // Wait up to 10 seconds if the device is currently connecting/not ready
        let attempts = 0;
        while (!sock.isReady && attempts < 10) {
            console.log(`[${deviceId}] Device not ready, waiting 1s... (Attempt ${attempts + 1}/10)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        // Check if connection is actually open after waiting
        if (!sock.isReady) {
            const queueError = new Error(`Device ${deviceId} is taking too long to connect. This message has been automatically queued.`);
            queueError.isQueued = true;
            throw queueError;
        }

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
            [jid, 'OUT', type, content, 'sent', deviceId, 0]
        );

        return { ...sentMsg, logId: result.insertId };
    } catch (error) {
        // Only log stack trace for unexpected errors
        const isStatusError = error.isQueued || error.message.includes('not found');
        if (isStatusError) {
            console.log(`[${deviceId}] Send failed: ${error.message}`);
        } else {
            console.error(`[${deviceId}] Send message error:`, error);
        }

        // Save failed log for retry
        try {
            await pool.query(
                'INSERT INTO message_logs (remote_jid, direction, type, content, status, device_id, retry_count, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [jid, 'OUT', type, content, 'failed', deviceId, 0, error.message]
            );
            console.log(`[${deviceId}] Failed message logged for retry: ${jid}`);
        } catch (logError) {
            console.error(`[${deviceId}] Error logging failed message:`, logError);
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
        if (!sock.isReady) throw new Error(`Device ${log.device_id} is not fully connected yet`);

        let sentMsg;

        if (log.type === 'text') {
            sentMsg = await sock.sendMessage(log.remote_jid, { text: log.content });
        } else if (log.type === 'image') {
            sentMsg = await sock.sendMessage(log.remote_jid, { image: { url: log.content } });
        } else if (log.type === 'video') {
            sentMsg = await sock.sendMessage(log.remote_jid, { video: { url: log.content } });
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

