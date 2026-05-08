import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function huntAgentKey() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Hunting for Agent Keys\n');

        const AGENT_ADDR = '0x4b388c7e2fa753c8492f879da41a13b4b9f99b0a';

        // 1. Check bash history for ANY 64-character hex strings
        console.log('🔍 Checking Command History (.bash_history)...');
        const history = await ssh.execCommand('cat /root/.bash_history | grep -E "[a-fA-F0-9]{64}"');
        console.log('=== POTENTIAL KEYS IN HISTORY ===');
        console.log(history.stdout || '(No keys found in history)');

        // 2. Check for any scripts in /tmp or /root that mention the agent
        console.log('\n🔍 Checking for temporary scripts...');
        const scripts = await ssh.execCommand(`grep -r "${AGENT_ADDR}" /tmp /root /home --exclude-dir=automaton`);
        console.log('=== SCRIPTS MENTIONING AGENT ===');
        console.log(scripts.stdout || '(No suspicious scripts found outside the bot folder)');

        // 3. Check PM2 logs (hacker might have run a process)
        console.log('\n🔍 Checking PM2 logs for leaks...');
        const pm2Logs = await ssh.execCommand('pm2 logs --lines 100 --nostream');
        console.log('=== RECENT PM2 LOGS ===');
        console.log(pm2Logs.stdout || '(No PM2 logs available)');

        process.exit(0);
    } catch (err) {
        console.error('❌ Hunt Failed:', err.message);
        process.exit(1);
    }
}

huntAgentKey();
