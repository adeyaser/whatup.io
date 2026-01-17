#!/usr/bin/env node
/**
 * Test the actual HTTP API endpoint for members
 * This simulates the frontend fetch to see what the API returns
 */

const http = require('http');
const https = require('https');

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function testAPI() {
    try {
        const baseURL = 'http://localhost:3001';
        const groupId = 3; // From test_members_api.js

        console.log('\n=== API Endpoint Test ===\n');
        console.log(`Testing: ${baseURL}/api/groups/${groupId}/members\n`);

        // First, get token
        console.log('1. Getting auth token...');
        // For testing, we'd need valid credentials, but let's test the endpoint structure

        // Direct test (without auth for now, will see if it's required)
        console.log(`2. Calling API endpoint...\n`);
        
        try {
            const result = await makeRequest(`${baseURL}/api/groups/${groupId}/members`);
            console.log(`Response Status: ${result.status}`);
            console.log(`Response Headers:`, result.headers);
            console.log(`Response Body:`, JSON.stringify(result.body, null, 2));
        } catch (err) {
            // Connection refused - server might not be running
            if (err.code === 'ECONNREFUSED') {
                console.log('❌ Server not running at localhost:3001');
                console.log('   Start the server with: npm start');
            } else {
                throw err;
            }
        }

        console.log('\n');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testAPI();
