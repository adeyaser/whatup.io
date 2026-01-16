const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');
const { initWhatsApp, createDevice, deleteDevice, sessions } = require('./services/whatsappService');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const authenticateToken = require('./middleware/auth');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Serve Documentation
app.get('/API_DOCS.md', (req, res) => {
    res.sendFile(path.join(__dirname, '../API_DOCS.md'));
});

app.get('/wa_gateway.postman_collection.json', (req, res) => {
    res.sendFile(path.join(__dirname, '../wa_gateway.postman_collection.json'));
});

// Routes
app.use('/auth', authRoutes);
app.use('/api', authenticateToken, apiRoutes); // Protect API
app.use('/api/groups', authenticateToken, groupRoutes); // Group Management

// Device Management Routes (Protected)
app.post('/api/device/add', authenticateToken, async (req, res) => {
    const { deviceId, name } = req.body;
    if (!deviceId) return res.status(400).json({ status: false, message: 'Device ID required' });

    const success = await createDevice(deviceId, name);
    if (success) {
        res.json({ status: true, message: 'Device created and session started' });
    } else {
        res.status(500).json({ status: false, message: 'Failed to create device' });
    }
});

app.post('/api/device/delete', authenticateToken, async (req, res) => {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ status: false, message: 'Device ID required' });

    const success = await deleteDevice(deviceId);
    if (success) {
        res.json({ status: true, message: 'Device deleted' });
        io.emit('device_deleted', deviceId);
    } else {
        res.status(500).json({ status: false, message: 'Failed to delete device' });
    }
});

app.get('/api/devices', authenticateToken, async (req, res) => {
    const pool = require('./config/database');
    try {
        const [rows] = await pool.query('SELECT device_id, name, status, created_at FROM devices');
        // Add active status from in-memory sessions
        const devices = rows.map(d => ({
            ...d,
            online: sessions.has(d.device_id)
        }));
        res.json({ status: true, data: devices });
    } catch (e) {
        res.status(500).json({ status: false, message: 'Error fetching devices' });
    }
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('A user connected via socket.io');

    // Allow client to request status update for a device
    socket.on('get_status', (deviceId) => {
        // Logic to emit status for specific device if needed
        // For now, status is pushed via events
    });
});

// Initialize WhatsApp (Loads all devices)
initWhatsApp(io).catch(err => console.error('Failed to initialize WhatsApp:', err));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
