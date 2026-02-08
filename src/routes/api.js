const express = require('express');
const router = express.Router();
const { sendMessage } = require('../services/whatsappService');
const { getSchedulerStatus, updateSettings, processFailedMessages, startSchedulerManually, stopSchedulerManually } = require('../services/messageScheduler');


router.post('/send-message', async (req, res) => {
    const { deviceId, number, message } = req.body;

    if (!deviceId || !number || !message) {
        return res.status(400).json({ status: false, message: 'Device ID, Number and message are required' });
    }

    try {
        await sendMessage(deviceId, number, 'text', message);
        res.json({ status: true, message: 'Message sent successfully' });
    } catch (error) {
        if (error.isQueued) {
            return res.status(202).json({ status: true, message: error.message, queued: true });
        }
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
        if (error.isQueued) {
            return res.status(202).json({ status: true, message: error.message, queued: true });
        }
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
        console.error('Error fetching logs:', e);
        res.status(500).json({
            status: false,
            message: 'Failed to fetch logs',
            error: process.env.NODE_ENV === 'development' ? e.message : undefined
        });
    }
});

// ===== Scheduler Settings API =====

// Get scheduler status and settings
router.get('/scheduler/status', (req, res) => {
    try {
        const status = getSchedulerStatus();
        res.json({ status: true, data: status });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

// Update scheduler settings
router.post('/scheduler/settings', async (req, res) => {
    try {
        const success = await updateSettings(req.body);
        if (success) {
            const status = getSchedulerStatus();
            res.json({ status: true, message: 'Settings updated', data: status });
        } else {
            res.status(400).json({ status: false, message: 'No valid settings provided' });
        }
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

// Trigger manual retry (for testing)
router.post('/scheduler/trigger', async (req, res) => {
    try {
        processFailedMessages();
        res.json({ status: true, message: 'Retry cycle triggered' });
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

// Start scheduler manually
router.post('/scheduler/start', async (req, res) => {
    try {
        const result = await startSchedulerManually();
        if (result.success) {
            res.json({ status: true, message: result.message, data: getSchedulerStatus() });
        } else {
            res.status(400).json({ status: false, message: result.message });
        }
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});

// Stop scheduler manually
router.post('/scheduler/stop', async (req, res) => {
    try {
        const result = stopSchedulerManually();
        if (result.success) {
            res.json({ status: true, message: result.message, data: getSchedulerStatus() });
        } else {
            res.status(400).json({ status: false, message: result.message });
        }
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});


module.exports = router;

