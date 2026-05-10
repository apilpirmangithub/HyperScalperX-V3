import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function deepCheck() {
    await ssh.connect({ host: '82.25.62.152', username: 'root', password: '@Avenged7XX', readyTimeout: 20000 });
    console.log('✅ Connected to VPS');

    let report = `Deep Trade Check - ${new Date().toISOString()}\n${'='.repeat(50)}\n\n`;

    // 1. PM2 status
    console.log('Fetching PM2 status...');
    const pm2 = await ssh.execCommand('pm2 jlist');
    const bots = JSON.parse(pm2.stdout);
    const bot = bots.find(p => p.name === 'HypeKing');
    if (bot) {
        report += '=== 🚀 PM2 STATUS ===\n';
        report += `Status: ${bot.pm2_env.status}\n`;
        report += `Uptime: ${Math.round((Date.now() - bot.pm2_env.pm_uptime) / 1000 / 60)} min\n`;
        report += `Memory: ${Math.round(bot.monit.memory / 1024 / 1024)} MB\n`;
        report += `CPU: ${bot.monit.cpu}%\n`;
        report += `Restarts: ${bot.pm2_env.restart_time}\n\n`;
    } else {
        report += '❌ HypeKing NOT FOUND\n\n';
    }

    // 2. Last 2000 output lines
    console.log('Fetching output logs (last 2000)...');
    const out = await ssh.execCommand('tail -n 2000 /root/.pm2/logs/HypeKing-out.log');
    report += '=== 💓 OUTPUT LOGS (Last 2000) ===\n' + out.stdout + '\n\n';

    // 3. Error logs  
    console.log('Fetching error logs...');
    const err = await ssh.execCommand('tail -n 200 /root/.pm2/logs/HypeKing-err.log');
    report += '=== ⚠️ ERROR LOGS (Last 200) ===\n' + (err.stdout || '(empty)') + '\n\n';

    // 4. DB open trades
    console.log('Checking DB open trades...');
    const dbOpen = await ssh.execCommand(`sqlite3 /root/.automaton/state.db "SELECT * FROM trades WHERE status='open' ORDER BY opened_at DESC LIMIT 20;"`);
    report += '=== 📈 DB OPEN TRADES ===\n' + (dbOpen.stdout || '(none)') + '\n\n';

    // 5. DB recent closed trades
    console.log('Checking DB closed trades...');
    const dbClosed = await ssh.execCommand(`sqlite3 /root/.automaton/state.db "SELECT * FROM trades WHERE status='closed' ORDER BY closed_at DESC LIMIT 20;"`);
    report += '=== 📉 DB RECENT CLOSED TRADES ===\n' + (dbClosed.stdout || '(none)') + '\n\n';

    // 6. Trade count by status
    console.log('Checking trade counts...');
    const count = await ssh.execCommand(`sqlite3 /root/.automaton/state.db "SELECT status, COUNT(*) FROM trades GROUP BY status;"`);
    report += '=== 📊 TRADE COUNT BY STATUS ===\n' + (count.stdout || '(none)') + '\n\n';

    // 7. DB tables
    const tables = await ssh.execCommand(`sqlite3 /root/.automaton/state.db ".tables"`);
    report += '=== 💾 DB TABLES ===\n' + (tables.stdout || '(none)') + '\n\n';

    // 8. Signal/Entry mentions in logs
    console.log('Searching for trade signals...');
    const signals = await ssh.execCommand(`grep -iE "signal|entry|OPEN|position|margin|insufficient|score|trigger|wick found|LONG|SHORT" /root/.pm2/logs/HypeKing-out.log | tail -n 100`);
    report += '=== 🎯 SIGNAL/ENTRY MENTIONS (Last 100) ===\n' + (signals.stdout || '(none)') + '\n\n';

    // 9. ENV config (sanitized)
    console.log('Checking env config...');
    const envConf = await ssh.execCommand(`cat /root/automaton/.env | grep -vE "KEY|SECRET|PASSWORD|PRIVATE"`);
    report += '=== ⚙️ ENV CONFIG (sanitized) ===\n' + (envConf.stdout || '(none)') + '\n\n';

    // 10. System resources
    console.log('Checking system resources...');
    const sys = await ssh.execCommand(`free -h && echo "---" && df -h / && echo "---" && uptime`);
    report += '=== 🖥️ SYSTEM RESOURCES ===\n' + sys.stdout + '\n\n';

    // 11. Binance account balance via bot
    console.log('Checking Binance balance...');
    const balance = await ssh.execCommand(`grep -i "balance" /root/.pm2/logs/HypeKing-out.log | tail -n 10`);
    report += '=== 💰 BALANCE HISTORY (Last 10) ===\n' + (balance.stdout || '(none)') + '\n\n';

    // 12. Check the actual bot source for entry conditions
    console.log('Checking bot entry logic source...');
    const srcCheck = await ssh.execCommand(`grep -n "minScore\\|MIN_SCORE\\|ENTRY_THRESHOLD\\|margin\\|position_size\\|positionSize\\|MIN_BALANCE\\|minBalance" /root/automaton/dist/*.js 2>/dev/null | head -n 30`);
    report += '=== 🔧 ENTRY CONFIG IN SOURCE ===\n' + (srcCheck.stdout || '(none)') + '\n';

    fs.writeFileSync('../deep_trade_check.txt', report);
    console.log('\n✅ Report saved to deep_trade_check.txt');
    process.exit(0);
}

deepCheck().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); });
