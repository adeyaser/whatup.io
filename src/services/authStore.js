const pool = require('../config/database');

// Lazy load baileys module (ESM)
let baileysModule = null;
const getBaileys = async () => {
    if (!baileysModule) {
        baileysModule = await import('@whiskeysockets/baileys');
    }
    return baileysModule;
};

const useMySQLAuthState = async (collectionId = 'default') => {
    // Load baileys module
    const baileys = await getBaileys();
    const { initAuthCreds, BufferJSON, proto } = baileys;

    // Helper to get table key
    const getKey = (type, id) => {
        // collectionId handles multi-device/multi-session support if needed later
        // for now just prefix
        return type === 'creds' ? `${collectionId}_creds` : `${collectionId}_${type}_${id}`;
    };

    const readData = async (type, id) => {
        const key = getKey(type, id);
        try {
            const [rows] = await pool.query('SELECT data FROM wa_sessions WHERE id = ?', [key]);
            if (rows.length > 0) {
                return JSON.parse(rows[0].data, BufferJSON.reviver);
            }
        } catch (error) {
            console.error('Error reading auth state:', error);
        }
        return null;
    };

    const writeData = async (type, id, data) => {
        const key = getKey(type, id);
        try {
            if (data) {
                const value = JSON.stringify(data, BufferJSON.replacer);
                await pool.query(
                    'INSERT INTO wa_sessions (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?',
                    [key, value, value]
                );
            } else {
                await pool.query('DELETE FROM wa_sessions WHERE id = ?', [key]);
            }
        } catch (error) {
            console.error('Error writing auth state:', error);
        }
    };

    // Initialize Credentials
    const creds = await readData('creds', 'main') || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            const val = await readData(type, id);
                            if (val) {
                                data[id] = val;
                            }
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const type in data) {
                        for (const id in data[type]) {
                            const value = data[type][id];
                            tasks.push(writeData(type, id, value));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: async () => {
            await writeData('creds', 'main', creds);
        }
    };
};

module.exports = useMySQLAuthState;
