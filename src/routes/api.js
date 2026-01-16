const express = require('express');
const router = express.Router();
const { sendMessage } = require('../services/whatsappService');

router.post('/send-message', async (req, res) => {
    const { deviceId, number, message } = req.body;

    if (!deviceId || !number || !message) {
        return res.status(400).json({ status: false, message: 'Device ID, Number and message are required' });
    }

    try {
        await sendMessage(deviceId, number, 'text', message);
        res.json({ status: true, message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Failed to send message', error: error.message });
    }
});

router.post('/send-media', async (req, res) => {
    const { deviceId, number, type, url, caption } = req.body; // type: 'image' or 'video'

    if (!deviceId || !number || !type || !url) {
        return res.status(400).json({ status: false, message: 'Device ID, Number, type (image/video), and url are required' });
    }

    try {
        await sendMessage(deviceId, number, type, url, caption);
        res.json({ status: true, message: 'Media sent successfully' });
    } catch (error) {
        res.status(500).json({ status: false, message: 'Failed to send media', error: error.message });
    }
});

// Get Message Logs
router.get('/logs', async (req, res) => {
    const pool = require('../config/database');
    try {
        const [rows] = await pool.query('SELECT * FROM message_logs ORDER BY created_at DESC LIMIT 100');
        res.json({ status: true, data: rows });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Failed to fetch logs' });
    }
});

module.exports = router;
