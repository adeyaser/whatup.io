const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const crypto = require('crypto');

// Get all users
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, username, password, api_key, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ status: true, data: rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch users' });
    }
});

// Get single user
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, username, password, api_key, created_at FROM users WHERE id = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }

        res.json({ status: true, data: rows[0] });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ status: false, message: 'Failed to fetch user' });
    }
});

// Create new user
router.post('/', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            status: false,
            message: 'Username and password are required'
        });
    }

    // Generate unique API key
    const apiKey = 'wa-' + crypto.randomBytes(16).toString('hex');

    try {
        // Check if username already exists
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                status: false,
                message: 'Username already exists'
            });
        }

        // Insert new user (in production, password should be hashed)
        const [result] = await pool.query(
            'INSERT INTO users (username, password, api_key) VALUES (?, ?, ?)',
            [username, password, apiKey]
        );

        res.json({
            status: true,
            message: 'User created successfully',
            data: {
                id: result.insertId,
                username,
                api_key: apiKey
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ status: false, message: 'Failed to create user' });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    const { username, password } = req.body;
    const userId = req.params.id;

    if (!username) {
        return res.status(400).json({
            status: false,
            message: 'Username is required'
        });
    }

    try {
        // Check if user exists
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'User not found'
            });
        }

        // Check if new username is already taken by another user
        const [duplicate] = await pool.query(
            'SELECT id FROM users WHERE username = ? AND id != ?',
            [username, userId]
        );

        if (duplicate.length > 0) {
            return res.status(400).json({
                status: false,
                message: 'Username already exists'
            });
        }

        // Update user
        let query, params;
        if (password) {
            // Update with password (in production, should be hashed)
            query = 'UPDATE users SET username = ?, password = ? WHERE id = ?';
            params = [username, password, userId];
        } else {
            // Update without password
            query = 'UPDATE users SET username = ? WHERE id = ?';
            params = [username, userId];
        }

        await pool.query(query, params);

        res.json({
            status: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ status: false, message: 'Failed to update user' });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        // Check if user exists
        const [existing] = await pool.query(
            'SELECT id, username FROM users WHERE id = ?',
            [userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'User not found'
            });
        }

        // Prevent deleting admin user
        if (existing[0].username === 'admin') {
            return res.status(403).json({
                status: false,
                message: 'Cannot delete admin user'
            });
        }

        // Delete user
        await pool.query('DELETE FROM users WHERE id = ?', [userId]);

        res.json({
            status: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ status: false, message: 'Failed to delete user' });
    }
});

// Regenerate API key
router.post('/:id/regenerate-key', async (req, res) => {
    const userId = req.params.id;
    const newApiKey = 'wa-' + crypto.randomBytes(16).toString('hex');

    try {
        // Check if user exists
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                status: false,
                message: 'User not found'
            });
        }

        // Update API key
        await pool.query(
            'UPDATE users SET api_key = ? WHERE id = ?',
            [newApiKey, userId]
        );

        res.json({
            status: true,
            message: 'API key regenerated successfully',
            data: { api_key: newApiKey }
        });
    } catch (error) {
        console.error('Error regenerating API key:', error);
        res.status(500).json({ status: false, message: 'Failed to regenerate API key' });
    }
});

module.exports = router;
