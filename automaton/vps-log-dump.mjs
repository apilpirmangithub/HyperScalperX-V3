import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function uploadAndRun() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Preparing Log Dump\n');

        // 1. Create the remote dumper script
        const dumperScript = `
import Database from '/root/automaton/node_modules/better-sqlite3/lib/index.js';
const db = new Database('/root/.automaton/state.db');
try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('TABLES:', JSON.stringify(tables));
    
    // Try to find activity table
    const table = tables.find(t => t.name.toLowerCase().includes('activit'))?.name;
    if (table) {
        const logs = db.prepare("SELECT * FROM " + table + " ORDER BY timestamp DESC LIMIT 100").all();
        console.log('LOGS_DATA:' + JSON.stringify(logs));
    } else {
        console.log('ERR: No activity table found');
    }
} catch (e) {
    console.log('ERR:' + e.message);
}
`;
        await ssh.execCommand("echo '" + dumperScript.replace(/'/g, "'\\''") + "' > /tmp/dumper.mjs");

        // 2. Run the dumper
        console.log('🚀 Running log dumper on VPS...');
        const result = await ssh.execCommand('node /tmp/dumper.mjs');
        
        console.log('=== DUMPER OUTPUT ===');
        console.log(result.stdout);
        if (result.stderr) console.error('STDERR:', result.stderr);

        process.exit(0);
    } catch (err) {
        console.error('❌ Investigation Failed:', err.message);
        process.exit(1);
    }
}

uploadAndRun();
