const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { sendMessage } = require('../services/whatsappService');

// --- Group Management ---

// Get all groups
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM contact_groups ORDER BY created_at DESC');
        // Get member count for each group
        for (const group of rows) {
            const [count] = await pool.query('SELECT COUNT(*) as total FROM group_members WHERE group_id = ?', [group.id]);
            group.member_count = count[0].total;
        }
        res.json({ status: true, data: rows });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// Create group
router.post('/create', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ status: false, message: 'Name is required' });
    try {
        const [result] = await pool.query('INSERT INTO contact_groups (name) VALUES (?)', [name]);
        res.json({ status: true, message: 'Group created', id: result.insertId });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// Delete group
router.post('/delete', async (req, res) => {
    const { id } = req.body;
    try {
        await pool.query('DELETE FROM contact_groups WHERE id = ?', [id]);
        res.json({ status: true, message: 'Group deleted' });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// --- Member Management ---

// Get members of a group
router.get('/:groupId/members', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM group_members WHERE group_id = ? ORDER BY created_at ASC', [req.params.groupId]);
        res.json({ status: true, data: rows });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// Add member
router.post('/manage/add-member', async (req, res) => {
    const { groupId, number, name } = req.body;
    if (!groupId || !number) return res.status(400).json({ status: false, message: 'Group ID and Number required' });
    try {
        await pool.query('INSERT INTO group_members (group_id, number, name) VALUES (?, ?, ?)', [groupId, number, name || '']);
        res.json({ status: true, message: 'Member added' });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// Remove member
router.post('/manage/remove-member', async (req, res) => {
    const { id } = req.body;
    try {
        await pool.query('DELETE FROM group_members WHERE id = ?', [id]);
        res.json({ status: true, message: 'Member removed' });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// --- Start Bulk Sending ---

router.post('/send-bulk', async (req, res) => {
    const { deviceId, groupId, message, type = 'text', url, caption } = req.body;

    if (!deviceId || !groupId) return res.status(400).json({ status: false, message: 'Device ID and Group ID required' });

    // Get all numbers
    try {
        const [members] = await pool.query('SELECT number FROM group_members WHERE group_id = ?', [groupId]);
        if (members.length === 0) return res.status(400).json({ status: false, message: 'Group is empty' });

        // Start processing in background
        processBulkSend(deviceId, members, { message, type, url, caption: caption || message });

        res.json({ status: true, message: `Bulk sending started for ${members.length} contacts.` });
    } catch (e) {
        res.status(500).json({ status: false, message: e.message });
    }
});

// Background function
async function processBulkSend(deviceId, members, content) {
    const DELAY_MS = 5000; // 5 seconds delay
    console.log(`Starting bulk send to ${members.length} numbers on device ${deviceId}`);

    for (const [index, member] of members.entries()) {
        const number = member.number;
        try {
            await new Promise(resolve => setTimeout(resolve, index === 0 ? 0 : DELAY_MS)); // No delay for first

            if (content.type === 'text') {
                await sendMessage(deviceId, number, 'text', content.message);
            } else {
                await sendMessage(deviceId, number, content.type, content.url, content.caption);
            }
            console.log(`[Bulk] Sent to ${number}`);
        } catch (e) {
            console.error(`[Bulk] Failed to send to ${number}:`, e.message);
            // Optional: Log failure to DB
        }
    }
    console.log(`[Bulk] Completed sending to group.`);
}

module.exports = router;
