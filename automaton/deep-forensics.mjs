import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function deepForensics() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Starting Deep Forensic Audit\n');

        let report = `🕵️ DEEP FORENSIC AUDIT REPORT (Phase 2)\n`;
        report += `Target Address: 0x5f9ed4abf10b6bb5cd7b2de920392883f87fe79e\n`;
        report += `${'='.repeat(60)}\n\n`;

        // 1. Search for the attacker's authorized address in ALL files
        console.log('🔍 Searching for attacker address in files...');
        const searchAddr = await ssh.execCommand('grep -r "0x5f9ed4abf10b6bb5cd7b2de920392883f87fe79e" /root /tmp /var/log 2>/dev/null');
        report += `=== SEARCH RESULTS: ATTACKER ADDRESS ===\n`;
        report += (searchAddr.stdout || '(no direct matches found in text files)') + '\n\n';

        // 2. Search for "multisig" or "multi-sig" strings
        console.log('🔍 Searching for multisig-related code...');
        const searchMultisig = await ssh.execCommand('grep -riE "multisig|multi-sig|signer|authorizedUser" /root /tmp 2>/dev/null | grep -v "node_modules" | head -50');
        report += `=== SEARCH RESULTS: MULTISIG KEYWORDS ===\n`;
        report += (searchMultisig.stdout || '(none found)') + '\n\n';

        // 3. Check for any hidden scripts or recently modified .mjs / .js files
        console.log('🔍 Checking for recently modified scripts...');
        const recentScripts = await ssh.execCommand('find /root /tmp -name "*.mjs" -o -name "*.js" -mtime -3 -ls 2>/dev/null');
        report += `=== RECENTLY MODIFIED SCRIPTS (Last 3 Days) ===\n`;
        report += (recentScripts.stdout || '(none)') + '\n\n';

        // 4. Check for any "npm install" or "yarn" activity that might indicate new tools
        console.log('🔍 Checking command history variations...');
        const historyFiles = await ssh.execCommand('ls -la /root/.*history 2>/dev/null');
        report += `=== HISTORY FILES STATUS ===\n`;
        report += historyFiles.stdout + '\n\n';

        // 5. Look for specific Hyperliquid API calls in logs
        console.log('🔍 Analyzing logs for Multi-Sig activation patterns...');
        const logPatterns = await ssh.execCommand('grep -iE "updateMultiSigUser|modifyMultiSig" /root/automaton/logs/* 2>/dev/null | tail -20');
        report += `=== HYPERLIQUID API LOGS (Multi-Sig) ===\n`;
        report += (logPatterns.stdout || '(no patterns found in app logs)') + '\n\n';

        // 6. Check for any networking tools like 'socat', 'cloudflared', or tunnels
        console.log('🔍 Checking for tunnel/backdoor tools...');
        const tools = await ssh.execCommand('which socat cloudflared ngrok 2>/dev/null; ps aux | grep -iE "tunnel|proxy" | grep -v grep');
        report += `=== ACTIVE TUNNELS/PROXIES ===\n`;
        report += (tools.stdout || '(none found)') + '\n\n';

        // 7. Check the bot's current .env address vs the authorized one
        console.log('🔍 Checking bot identity...');
        const botEnv = await ssh.execCommand('grep -E "ADDRESS|PUBLIC_KEY" /root/automaton/.env 2>/dev/null');
        report += `=== BOT CONFIG IDENTITY ===\n`;
        report += (botEnv.stdout || '(could not read .env)') + '\n\n';

        const reportPath = '../vps_deep_forensics_report.txt';
        fs.writeFileSync(reportPath, report);
        console.log(`\n✅ DEEP FORENSIC SAVED to ${reportPath}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err.message);
        process.exit(1);
    }
}

deepForensics();
