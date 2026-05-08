import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function deepDump() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Deep Database Audit\n');

        const dumperScript = `
import Database from '/root/automaton/node_modules/better-sqlite3/lib/index.js';
const db = new Database('/root/.automaton/state.db');
try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('TABLES:' + JSON.stringify(tables));
    
    for (const table of tables) {
        const count = db.prepare("SELECT COUNT(*) as c FROM " + table.name).get();
        console.log('COUNT[' + table.name + ']: ' + count.c);
        
        if (table.name === 'identity' || table.name === 'kv') {
            const rows = db.prepare("SELECT * FROM " + table.name).all();
            console.log('DATA[' + table.name + ']:' + JSON.stringify(rows));
        }
    }
} catch (e) {
    console.log('ERR:' + e.message);
}
`;
        await ssh.execCommand("echo '" + dumperScript.replace(/'/g, "'\\''") + "' > /tmp/dumper_deep.mjs");

        const result = await ssh.execCommand('node /tmp/dumper_deep.mjs');
        console.log(result.stdout);

        process.exit(0);
    } catch (err) {
        console.error('❌ Investigation Failed:', err.message);
        process.exit(1);
    }
}

deepDump();
