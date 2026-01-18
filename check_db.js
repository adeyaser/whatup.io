const pool = require('./src/config/database');

async function checkSchema() {
    try {
        const [rows] = await pool.query('DESCRIBE devices');
        console.log('--- Devices Table Schema ---');
        console.table(rows);
        const hasQr = rows.find(r => r.Field === 'qr_code');
        if (hasQr) {
            console.log('✅ Column qr_code exists.');
        } else {
            console.log('❌ Column qr_code is MISSING!');
        }
        process.exit(0);
    } catch (err) {
        console.error('Error connecting to DB:', err.message);
        process.exit(1);
    }
}

checkSchema();
