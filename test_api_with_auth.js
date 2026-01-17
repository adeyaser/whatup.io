#!/usr/bin/env node
/**
 * Complete API test with authentication
 */

const http = require('http');
const https = require('https');

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: data.startsWith('{') || data.startsWith('[') ? JSON.parse(data) : data
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
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

async function testAPIWithAuth() {
    try {
        const baseURL = 'http://localhost:3001';
        const groupId = 3;

        console.log('\n=== Complete API Test with Authentication ===\n');

        // 1. Login
        console.log('1. Logging in...');
        const loginRes = await makeRequest(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                username: 'admin',
                password: 'admin123'
            }
        });

        if (loginRes.status !== 200) {
            console.log(`   ❌ Login failed: ${loginRes.status}`);
            console.log('   Response:', loginRes.body);
            return;
        }

        const token = loginRes.body.data?.token || loginRes.body.token;
        console.log(`   ✅ Login successful, token: ${token?.substring(0, 20)}...`);

        // 2. Get members
        console.log(`\n2. Fetching members for group ${groupId}...\n`);
        const membersRes = await makeRequest(`${baseURL}/api/groups/${groupId}/members`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Status: ${membersRes.status}`);
        console.log('Response:');
        console.log(JSON.stringify(membersRes.body, null, 2));

        if (membersRes.status === 200 && membersRes.body.status) {
            const count = Array.isArray(membersRes.body.data) ? membersRes.body.data.length : 0;
            console.log(`\n✅ API returned ${count} members`);
            
            if (count > 0) {
                console.log('\nSample member:');
                console.log(JSON.stringify(membersRes.body.data[0], null, 2));
            }
        } else {
            console.log('\n❌ Unexpected response format');
        }

        console.log('\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPIWithAuth();
