const mysql = require('mysql2/promise');
require('dotenv').config();

const dbHost = process.env.DB_HOST || 'localhost';
console.log(`[Database] Attempting connection to host: ${dbHost}`);

const pool = mysql.createPool({
    host: dbHost,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wa_gateway',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection on initialization
pool.getConnection()
    .then(connection => {
        console.log('Database connection established');
        connection.release();
    })
    .catch(error => {
        console.error('Database connection error:', error.message);
        // Don't throw - allow app to start but operations will fail gracefully
    });

// Handle pool errors
pool.on('error', (err) => {
    console.error('Database pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Database connection lost. Attempting to reconnect...');
    }
});

module.exports = pool;
