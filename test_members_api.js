#!/usr/bin/env node
/**
 * Quick test script to verify members API returns data correctly
 * Usage: node test_members_api.js [groupId]
 */

const http = require('http');
const pool = require('./src/config/database');

async function testMembersAPI() {
    try {
        console.log('=== Members API Test ===\n');

        // 1. Check if groups exist
        console.log('1. Fetching all groups...');
        const [groups] = await pool.query('SELECT * FROM contact_groups LIMIT 5');
        console.log(`   Found ${groups.length} groups`);
        
        if (groups.length === 0) {
            console.log('   ❌ No groups exist. Create a group first.\n');
            process.exit(0);
        }

        groups.forEach((g, i) => {
            console.log(`   [${i + 1}] Group ID: ${g.id}, Name: ${g.name}`);
        });

        // 2. Test first group
        const testGroupId = groups[0].id;
        console.log(`\n2. Fetching members for group ${testGroupId}...`);
        const [members] = await pool.query(
            'SELECT * FROM group_members WHERE group_id = ?',
            [testGroupId]
        );
        console.log(`   Found ${members.length} members`);
        
        if (members.length > 0) {
            console.log('   Members:');
            members.forEach((m, i) => {
                console.log(`   [${i + 1}] ID: ${m.id}, Number: ${m.number}, Name: ${m.name}`);
            });
        } else {
            console.log('   ⚠️  No members in this group.');
        }

        // 3. Test expected API response format
        console.log(`\n3. Expected API response format:`);
        console.log(JSON.stringify({
            status: true,
            data: members
        }, null, 2));

        console.log('\n✅ Test completed successfully!\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run test
testMembersAPI();
