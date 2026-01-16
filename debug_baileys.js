const baileys = require('@whiskeysockets/baileys');
console.log('Baileys exports keys:', Object.keys(baileys));
console.log('default export:', typeof baileys.default);
console.log('makeInMemoryStore:', typeof baileys.makeInMemoryStore);
