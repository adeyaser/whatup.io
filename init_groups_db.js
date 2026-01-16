const pool = require('./src/config/database');
const fs = require('fs');

async function initDb() {
    try {
        const sql = fs.readFileSync('./groups_schema.sql', 'utf8');
        const statements = sql.split(';').filter(s => s.trim());

        for (const statement of statements) {
            await pool.query(statement);
            console.log('Executed:', statement.substring(0, 50) + '...');
        }
        console.log('Groups DB initialized successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error initializing DB:', err);
        process.exit(1);
    }
}

initDb();
