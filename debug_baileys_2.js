const baileys = require('@whiskeysockets/baileys');
console.log('default export keys:', Object.keys(baileys.default || {}));
console.log('is makeWASocket default?', typeof baileys.default === 'function');
try {
    const storeModule = require('@whiskeysockets/baileys/lib/Store');
    console.log('Found in lib/Store?', !!storeModule);
} catch (e) { console.log('Not in lib/Store'); }

console.log('Does root have makeInMemoryStore?', 'makeInMemoryStore' in baileys);
