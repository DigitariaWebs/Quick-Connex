#!/usr/bin/env node

/**
 * Check for running servers on common ports
 * Usage: node scripts/check-servers.js
 */

const { execSync } = require('child_process');

const PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006];

console.log('🔍 Checking for running servers...\n');

let foundServers = false;

for (const port of PORTS) {
    try {
        const result = execSync(`lsof -i :${port}`, { encoding: 'utf8', stdio: 'pipe' });
        if (result.trim()) {
            foundServers = true;
            console.log(`📡 Port ${port}:`);
            console.log(result);
            console.log('');
        }
    } catch (error) {
        // No process on this port
    }
}

if (!foundServers) {
    console.log('✅ No servers found on ports 3000-3006');
} else {
    console.log('💡 To kill all servers, run: npm run kill-servers');
}
