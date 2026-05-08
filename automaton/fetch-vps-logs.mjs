import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function fetchLogs() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 20000
        });
        console.log('✅ Connected to VPS\n');

        let report = `VPS Log Audit - ${new Date().toISOString()}\n`;
        report += `==========================================\n\n`;

        // 1. PM2 Status
        console.log('Fetching PM2 status...');
        const pm2Status = await ssh.execCommand('pm2 jlist');
        const pm2Data = JSON.parse(pm2Status.stdout);
        const bot = pm2Data.find(p => p.name === 'HypeKing');
        
        report += `=== 🚀 PM2 PROCESS STATUS ===\n`;
        if (bot) {
            report += `Status: ${bot.pm2_env.status}\n`;
            report += `Uptime: ${Math.round((Date.now() - bot.pm2_env.pm_uptime) / 1000 / 60)} minutes\n`;
            report += `Memory: ${Math.round(bot.monit.memory / 1024 / 1024)} MB\n`;
            report += `CPU: ${bot.monit.cpu}%\n`;
            report += `Restarts: ${bot.pm2_env.restart_time}\n\n`;
        } else {
            report += `❌ HypeKing process NOT FOUND in PM2\n\n`;
        }

        // 2. Error Logs
        console.log('Fetching error logs...');
        const errLogs = await ssh.execCommand('tail -n 50 /root/.pm2/logs/HypeKing-err.log');
        report += `=== ⚠️ RECENT ERROR LOGS (Last 50) ===\n`;
        report += (errLogs.stdout || '(no errors in log)') + '\n\n';

        // 3. Output Logs
        console.log('Fetching output logs...');
        const outLogs = await ssh.execCommand('tail -n 50 /root/.pm2/logs/HypeKing-out.log');
        report += `=== 💓 BOT OUTPUT LOGS (Last 50) ===\n`;
        report += outLogs.stdout + '\n';

        fs.writeFileSync('../vps_current_logs.txt', report);
        console.log('\n✅ Logs fetched and saved to vps_current_logs.txt');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to fetch logs:', err.message);
        process.exit(1);
    }
}

fetchLogs();
