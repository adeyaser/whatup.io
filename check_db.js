const pool = require('./src/config/database');

async function checkData() {
    try {
        const [rows] = await pool.query('SELECT device_id, status, CHAR_LENGTH(qr_code) as qr_len FROM devices');
        console.log('--- Devices Current Data ---');
        console.table(rows);

        const scanningCount = rows.filter(r => r.status === 'scanning' && r.qr_len > 0).length;
        if (scanningCount > 0) {
            console.log(`✅ ${scanningCount} devices have active QR codes in DB.`);
        } else {
            console.log('❌ No active QR codes found in DB. Make sure your local script is running.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error connecting to DB:', err.message);
        process.exit(1);
    }
}

checkData();
