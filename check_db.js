const pool = require('./src/config/database');

async function checkData() {
    try {
        // Do not rely on qr_code column; QR is emitted via websocket (socket.io)
        const [rows] = await pool.query('SELECT device_id, status FROM devices');
        console.log('--- Devices Current Data ---');
        console.table(rows);

        const scanningCount = rows.filter(r => r.status === 'scanning').length;
        if (scanningCount > 0) {
            console.log(`✅ ${scanningCount} devices are currently scanning (QR emitted via websocket).`);
        } else {
            console.log('❌ No devices in scanning status. QR is not stored in DB by design.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error connecting to DB:', err.message);
        process.exit(1);
    }
}

checkData();
