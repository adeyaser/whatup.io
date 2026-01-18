const pool = require('../config/database');
const { retryMessage, sessions } = require('./whatsappService');

// Default configuration (fallback if DB fails)
const DEFAULT_CONFIG = {
    enabled: true,
    batch_size: 5,
    interval_minutes: 30,
    min_delay_seconds: 30,
    max_delay_seconds: 60,
    max_retries: 3,
    cooldown_minutes: 5
};

let schedulerInterval = null;
let isProcessing = false;
let currentConfig = { ...DEFAULT_CONFIG };

// Load settings from database
const loadSettings = async () => {
    try {
        const [rows] = await pool.query('SELECT * FROM scheduler_settings WHERE id = 1');
        if (rows.length > 0) {
            currentConfig = { ...DEFAULT_CONFIG, ...rows[0] };
            console.log('[Scheduler] Settings loaded from database:', currentConfig);
        } else {
            console.log('[Scheduler] Using default settings (no DB config found)');
        }
        return currentConfig;
    } catch (error) {
        console.error('[Scheduler] Error loading settings:', error.message);
        console.log('[Scheduler] Using default settings');
        return DEFAULT_CONFIG;
    }
};

// Update settings in database
const updateSettings = async (newSettings) => {
    try {
        const fields = [];
        const values = [];

        const allowedFields = ['enabled', 'batch_size', 'interval_minutes', 'min_delay_seconds', 'max_delay_seconds', 'max_retries', 'cooldown_minutes'];

        for (const field of allowedFields) {
            if (newSettings[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(newSettings[field]);
            }
        }

        if (fields.length === 0) return false;

        await pool.query(`UPDATE scheduler_settings SET ${fields.join(', ')} WHERE id = 1`, values);

        // Reload settings
        await loadSettings();

        // Restart scheduler with new interval if running
        if (schedulerInterval) {
            stopScheduler();
            startScheduler();
        }

        return true;
    } catch (error) {
        console.error('[Scheduler] Error updating settings:', error);
        return false;
    }
};

// Random delay between min and max
const getRandomDelay = () => {
    const min = currentConfig.min_delay_seconds * 1000;
    const max = currentConfig.max_delay_seconds * 1000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Process failed messages
const processFailedMessages = async () => {
    if (isProcessing) {
        console.log('[Scheduler] Already processing, skipping...');
        return;
    }

    // Reload settings before each cycle
    await loadSettings();

    if (!currentConfig.enabled) {
        console.log('[Scheduler] Disabled, skipping...');
        return;
    }

    isProcessing = true;
    console.log('[Scheduler] Starting retry cycle...');

    try {
        // Get failed messages that are old enough (cooldown) and under retry limit
        const [rows] = await pool.query(`
            SELECT * FROM message_logs 
            WHERE status = 'failed' 
              AND retry_count < ?
              AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
            ORDER BY created_at ASC 
            LIMIT ?
        `, [currentConfig.max_retries, currentConfig.cooldown_minutes, currentConfig.batch_size]);

        if (rows.length === 0) {
            console.log('[Scheduler] No failed messages to retry.');
            isProcessing = false;
            return;
        }

        console.log(`[Scheduler] Found ${rows.length} failed messages to retry.`);

        for (let i = 0; i < rows.length; i++) {
            const log = rows[i];

            // Check if device is connected
            const sock = sessions.get(log.device_id);
            if (!sock) {
                console.log(`[Scheduler] Device ${log.device_id} not connected, skipping message ${log.id}`);
                continue;
            }

            try {
                console.log(`[Scheduler] Retrying message ${log.id} (attempt ${log.retry_count + 1}/${currentConfig.max_retries})...`);
                await retryMessage(log.id);
                console.log(`[Scheduler] Message ${log.id} sent successfully!`);
            } catch (error) {
                console.error(`[Scheduler] Failed to retry message ${log.id}:`, error.message);

                // Check if max retries exceeded
                if (log.retry_count + 1 >= currentConfig.max_retries) {
                    await pool.query('UPDATE message_logs SET status = ? WHERE id = ?', ['permanently_failed', log.id]);
                    console.log(`[Scheduler] Message ${log.id} marked as permanently failed.`);
                }
            }

            // Wait before next message (if not last)
            if (i < rows.length - 1) {
                const delay = getRandomDelay();
                console.log(`[Scheduler] Waiting ${Math.round(delay / 1000)}s before next message...`);
                await sleep(delay);
            }
        }

        console.log('[Scheduler] Retry cycle complete.');
    } catch (error) {
        console.error('[Scheduler] Error in retry cycle:', error);
    } finally {
        isProcessing = false;
    }
};

// Start the scheduler
const startScheduler = async () => {
    if (schedulerInterval) {
        console.log('[Scheduler] Already running.');
        return;
    }

    // Load settings from DB
    await loadSettings();

    if (!currentConfig.enabled) {
        console.log('[Scheduler] Disabled in settings, not starting.');
        return;
    }

    const intervalMs = currentConfig.interval_minutes * 60 * 1000;
    console.log(`[Scheduler] Started. Will retry up to ${currentConfig.batch_size} failed messages every ${currentConfig.interval_minutes} minutes.`);

    // Run immediately on start
    processFailedMessages();

    // Then run at interval
    schedulerInterval = setInterval(processFailedMessages, intervalMs);
};

// Stop the scheduler
const stopScheduler = () => {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[Scheduler] Stopped.');
    }
};

// Get scheduler status
const getSchedulerStatus = () => ({
    running: !!schedulerInterval,
    isProcessing,
    config: currentConfig
});

module.exports = {
    startScheduler,
    stopScheduler,
    processFailedMessages,
    getSchedulerStatus,
    loadSettings,
    updateSettings
};
