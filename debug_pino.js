const pino = require('pino');
console.log('Type of pino:', typeof pino);
try {
    const logger = pino({ level: 'silent' });
    console.log('Logger created successfully');
} catch (e) {
    console.error('Error calling pino:', e);
}
