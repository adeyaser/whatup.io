const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes and middleware
const apiRoutes = require('../src/routes/api');
const authRoutes = require('../src/routes/auth');
const groupRoutes = require('../src/routes/groups');
const authenticateToken = require('../src/middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Serve Documentation
app.get('/API_DOCS.md', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '../API_DOCS.md'));
    } catch (error) {
        res.status(500).json({ status: false, message: 'Error serving documentation' });
    }
});

app.get('/wa_gateway.postman_collection.json', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '../wa_gateway.postman_collection.json'));
    } catch (error) {
        res.status(500).json({ status: false, message: 'Error serving Postman collection' });
    }
});

// Routes
app.use('/auth', authRoutes);
app.use('/api', authenticateToken, apiRoutes);
app.use('/api/groups', authenticateToken, groupRoutes);

// Device Management Routes (Protected)
app.post('/api/device/add', authenticateToken, async (req, res) => {
    try {
        const { deviceId, name } = req.body;
        if (!deviceId) {
            return res.status(400).json({ status: false, message: 'Device ID required' });
        }

        const { createDevice } = require('../src/services/whatsappService');
        const success = await createDevice(deviceId, name);

        if (success) {
            res.json({ status: true, message: 'Device created and session started' });
        } else {
            res.status(500).json({ status: false, message: 'Failed to create device' });
        }
    } catch (error) {
        console.error('Error in /api/device/add:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to create device',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.post('/api/device/delete', authenticateToken, async (req, res) => {
    try {
        const { deviceId } = req.body;
        if (!deviceId) {
            return res.status(400).json({ status: false, message: 'Device ID required' });
        }

        const { deleteDevice } = require('../src/services/whatsappService');
        const success = await deleteDevice(deviceId);

        if (success) {
            res.json({ status: true, message: 'Device deleted' });
        } else {
            res.status(500).json({ status: false, message: 'Failed to delete device' });
        }
    } catch (error) {
        console.error('Error in /api/device/delete:', error);
        res.status(500).json({
            status: false,
            message: 'Failed to delete device',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/devices', authenticateToken, async (req, res) => {
    try {
        const pool = require('../src/config/database');
        const { sessions } = require('../src/services/whatsappService');

        const [rows] = await pool.query('SELECT device_id, name, status, created_at FROM devices');
        const devices = rows.map(d => ({
            ...d,
            online: sessions.has(d.device_id)
        }));

        res.json({ status: true, data: devices });
    } catch (error) {
        console.error('Error in /api/devices:', error);
        res.status(500).json({
            status: false,
            message: 'Error fetching devices',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    } catch (error) {
        res.status(500).json({ status: false, message: 'Error serving index page' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: true, message: 'Server is running' });
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        status: false,
        message: 'Internal server error',
        error: err.message, // Re-enabled for debugging
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ status: false, message: 'Route not found' });
});

// Export the Express app for Vercel
module.exports = app;

