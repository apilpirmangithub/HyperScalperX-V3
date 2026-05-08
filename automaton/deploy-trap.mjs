import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function deployHoneypot() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Deploying SENTINEL-TRAP\n');

        // 1. Create the Fake Honey File
        const honeyContent = JSON.stringify({
            wallet_name: "Main_Vault_Cold_Storage",
            address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            mnemonic: "crystal anchor solid drift logic verify actual budget monitor sound simple theory",
            private_key: "0xabc123def4567890abc123def4567890abc123def4567890abc123def4567890",
            balance_usd: "42,500.00"
        }, null, 4);
        
        await ssh.execCommand(`echo '${honeyContent}' > /root/wallets_backup_2026.json`);
        console.log('🍯 Honey file created: /root/wallets_backup_2026.json');

        // 2. Create the Watcher Script
        const watcherScript = `
import fs from 'fs';
import { exec } from 'child_process';

const TARGET_FILE = '/root/wallets_backup_2026.json';
const LOG_FILE = '/root/.intruder_vault';

console.log('👀 SENTINEL-TRAP is active. Watching ' + TARGET_FILE);

fs.watch(TARGET_FILE, (eventType, filename) => {
    if (eventType === 'change' || eventType === 'rename') {
        const timestamp = new Date().toISOString();
        exec('last -i -n 1', (err, stdout) => {
            const lastLogin = stdout.trim();
            const logEntry = \`[$\{timestamp\}] 🚨 ALERT: File accessed! Event: $\{eventType\}. Last Login Info: $\{lastLogin\}\\n\`;
            fs.appendFileSync(LOG_FILE, logEntry);
            console.log(logEntry);
        });
    }
});
`;
        await ssh.execCommand(`echo "${watcherScript}" > /root/watcher.mjs`);

        // 3. Start the trap with PM2
        await ssh.execCommand('pm2 delete SENTINEL-TRAP || true');
        await ssh.execCommand('pm2 start /root/watcher.mjs --name SENTINEL-TRAP');
        
        console.log('\n🚀 SENTINEL-TRAP is now LIVE and running in background.');
        console.log('Log file: /root/.intruder_vault');

        process.exit(0);
    } catch (err) {
        console.error('❌ Deployment Failed:', err.message);
        process.exit(1);
    }
}

deployHoneypot();
