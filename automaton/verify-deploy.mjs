import { NodeSSH } from 'node-ssh';
const ssh = new NodeSSH();

async function check() {
    await ssh.connect({ host: '82.25.62.152', username: 'root', password: '@Avenged7XX', readyTimeout: 20000 });
    
    // Check DB tables
    const db = await ssh.execCommand('sqlite3 /root/.automaton/state.db ".tables"');
    console.log('DB Tables:', db.stdout || '(none)');
    
    // Check latest logs (last 30 lines)
    const logs = await ssh.execCommand('tail -n 30 /root/.pm2/logs/HypeKing-out.log');
    console.log('\n=== Latest Logs ===');
    console.log(logs.stdout);
    
    // Check for errors
    const err = await ssh.execCommand('tail -n 10 /root/.pm2/logs/HypeKing-err.log');
    if (err.stdout && err.stdout.trim()) {
        console.log('\n=== Errors ===');
        console.log(err.stdout);
    } else {
        console.log('\n✅ No errors in error log!');
    }
    
    // PM2 status
    const pm2 = await ssh.execCommand('pm2 jlist');
    const bots = JSON.parse(pm2.stdout);
    const bot = bots.find(p => p.name === 'HypeKing');
    if (bot) {
        console.log(`\n=== PM2 Status ===`);
        console.log(`Status: ${bot.pm2_env.status}`);
        console.log(`Uptime: ${Math.round((Date.now() - bot.pm2_env.pm_uptime) / 1000)}s`);
        console.log(`Restarts: ${bot.pm2_env.restart_time}`);
    }
    
    process.exit(0);
}

check().catch(e => { console.error(e.message); process.exit(1); });
