const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
// const bcrypt = require('bcrypt'); // Disable bcrypt for now to match 'admin123' plain text in database.sql

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_this';

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: false, message: 'Username and password required' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ status: false, message: 'Invalid credentials' });
        }

        const user = rows[0];

        // Simple comparison for the default admin user inserted in database.sql
        // In production, use bcrypt.compare(password, user.password)
        if (password !== user.password) {
            return res.status(401).json({ status: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ status: true, token, user: { id: user.id, username: user.username } });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
