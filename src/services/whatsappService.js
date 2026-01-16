const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const pool = require('../config/database');
const useMySQLAuthState = require('./authStore');
const { Boom } = require('@hapi/boom');

// Map to store active sessions: deviceId -> socket instance
const sessions = new Map();
let io;

const initWhatsApp = async (socketIo) => {
    io = socketIo;

    // Load existing devices from DB and start them
    const [rows] = await pool.query('SELECT device_id FROM devices');
    for (const row of rows) {
        startSession(row.device_id);
    }
};

const startSession = async (deviceId) => {
    console.log(`Starting session for device: ${deviceId}`);
    // Pass deviceId to state handler to prefix keys
    const { state, saveCreds } = await useMySQLAuthState(deviceId);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['WA Gateway', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true,
    });

    sessions.set(deviceId, sock);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            QRCode.toDataURL(qr, (err, url) => {
                if (!err) {
                    io.emit(`qr_code:${deviceId}`, url);
                    console.log(`QR Code emitted for ${deviceId}`);
                }
            });
            // Update status in DB
            await pool.query('UPDATE devices SET status = ? WHERE device_id = ?', ['scanning', deviceId]);
            io.emit('device_status', { deviceId, status: 'scanning' });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`Connection closed for ${deviceId}. Reconnecting:`, shouldReconnect);

            if (shouldReconnect) {
                // Emit connecting status before restarting
                io.emit('device_status', { deviceId, status: 'connecting' });
                startSession(deviceId);
            } else {
                console.log(`Device ${deviceId} logged out.`);
                await pool.query('UPDATE devices SET status = ? WHERE device_id = ?', ['disconnected', deviceId]);
                io.emit('device_status', { deviceId, status: 'disconnected' });
                // Clean up session data if needed
                sessions.delete(deviceId);
            }
        } else if (connection === 'open') {
            console.log(`Opened connection for ${deviceId}`);
            const user = sock.user;
            await pool.query('UPDATE devices SET status = ?, name = ? WHERE device_id = ?', ['connected', user.name || user.id, deviceId]);
            io.emit('device_status', { deviceId, status: 'connected', user });
        } else if (connection === 'connecting') {
            io.emit('device_status', { deviceId, status: 'connecting' });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
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

        console.log(`[${deviceId}] Received message from ${remoteJid}: ${text}`);

        // Save to DB
        try {
            await pool.query(
                'INSERT INTO message_logs (remote_jid, direction, type, content, status, device_id) VALUES (?, ?, ?, ?, ?, ?)',
                [remoteJid, 'IN', messageType, text || content, 'received', deviceId]
            );

            io.emit('new_message', {
                deviceId,
                from: remoteJid,
                message: text,
                timestamp: new Date()
            });

        } catch (err) {
            console.error('Error saving message log:', err);
        }
    });
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
    const sock = sessions.get(deviceId);
    if (!sock) throw new Error(`Device ${deviceId} not found or not connected`);

    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    let sentMsg;

    try {
        if (type === 'text') {
            sentMsg = await sock.sendMessage(jid, { text: content });
        } else if (type === 'image') {
            sentMsg = await sock.sendMessage(jid, { image: { url: content }, caption: caption });
        } else if (type === 'video') {
            sentMsg = await sock.sendMessage(jid, { video: { url: content }, caption: caption });
        }

        // Save log
        await pool.query(
            'INSERT INTO message_logs (remote_jid, direction, type, content, status, device_id) VALUES (?, ?, ?, ?, ?, ?)',
            [jid, 'OUT', type, (type === 'text' ? content : `[${type}] ${caption}`), 'sent', deviceId]
        );

        return sentMsg;
    } catch (error) {
        console.error('Send message error:', error);
        throw error;
    }
};

module.exports = { initWhatsApp, sendMessage, createDevice, deleteDevice, sessions };
