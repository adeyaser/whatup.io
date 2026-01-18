const pool = require('../config/database');
const { retryMessage, sessions } = require('./whatsappService');

// Configuration
const BATCH_SIZE = 5;           // Max messages per batch
const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MIN_DELAY_MS = 30 * 1000; // 30 seconds min delay between messages
const MAX_DELAY_MS = 60 * 1000; // 60 seconds max delay
const MAX_RETRIES = 3;          // Max retry attempts per message
const COOLDOWN_MINUTES = 5;     // Only retry messages older than 5 minutes

let schedulerInterval = null;
let isProcessing = false;

// Random delay between min and max
const getRandomDelay = () => {
    return Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
};

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Process failed messages
const processFailedMessages = async () => {
    if (isProcessing) {
        console.log('[Scheduler] Already processing, skipping...');
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
        `, [MAX_RETRIES, COOLDOWN_MINUTES, BATCH_SIZE]);

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
                console.log(`[Scheduler] Retrying message ${log.id} (attempt ${log.retry_count + 1}/${MAX_RETRIES})...`);
                await retryMessage(log.id);
                console.log(`[Scheduler] Message ${log.id} sent successfully!`);
            } catch (error) {
                console.error(`[Scheduler] Failed to retry message ${log.id}:`, error.message);

                // Check if max retries exceeded
                if (log.retry_count + 1 >= MAX_RETRIES) {
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
const startScheduler = () => {
    if (schedulerInterval) {
        console.log('[Scheduler] Already running.');
        return;
    }

    console.log(`[Scheduler] Started. Will retry up to ${BATCH_SIZE} failed messages every ${INTERVAL_MS / 60000} minutes.`);

    // Run immediately on start
    processFailedMessages();

    // Then run at interval
    schedulerInterval = setInterval(processFailedMessages, INTERVAL_MS);
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
    config: {
        batchSize: BATCH_SIZE,
        intervalMinutes: INTERVAL_MS / 60000,
        maxRetries: MAX_RETRIES,
        cooldownMinutes: COOLDOWN_MINUTES,
        delayRange: `${MIN_DELAY_MS / 1000}-${MAX_DELAY_MS / 1000}s`
    }
});

module.exports = { startScheduler, stopScheduler, processFailedMessages, getSchedulerStatus };
