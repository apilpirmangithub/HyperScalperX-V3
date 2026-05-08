import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function forensicAudit() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Running Forensic Investigation\n');

        let report = `🔍 FORENSIC INVESTIGATION - WALLET COMPROMISE\n`;
        report += `Timestamp: ${new Date().toISOString()}\n`;
        report += `${'='.repeat(60)}\n\n`;

        // 1. Full auth.log - ALL successful logins with timestamps
        console.log('[1/12] Full SSH login timeline...');
        const allLogins = await ssh.execCommand('grep "Accepted" /var/log/auth.log 2>/dev/null');
        report += `=== 🔑 COMPLETE SSH LOGIN TIMELINE ===\n`;
        report += (allLogins.stdout || '(empty)') + '\n\n';

        // 2. Check what 77.35.193.51 did (the one who planted SSH key)
        console.log('[2/12] Tracing IP 77.35.193.51 activities...');
        const ip77 = await ssh.execCommand('grep "77.35.193.51" /var/log/auth.log 2>/dev/null');
        report += `=== 🕵️ IP 77.35.193.51 — ALL AUTH LOG ENTRIES ===\n`;
        report += (ip77.stdout || '(no entries)') + '\n\n';

        // 3. Check what 185.115.37.43 did
        console.log('[3/12] Tracing IP 185.115.37.43 activities...');
        const ip185 = await ssh.execCommand('grep "185.115.37.43" /var/log/auth.log 2>/dev/null');
        report += `=== 🕵️ IP 185.115.37.43 — ALL AUTH LOG ENTRIES ===\n`;
        report += (ip185.stdout || '(no entries)') + '\n\n';

        // 4. Check authorized_keys in detail
        console.log('[4/12] Checking authorized_keys...');
        const authKeys = await ssh.execCommand('cat -A /root/.ssh/authorized_keys; echo "---"; stat /root/.ssh/authorized_keys; echo "---"; md5sum /root/.ssh/authorized_keys');
        report += `=== 🔐 AUTHORIZED SSH KEYS (FULL DETAIL) ===\n`;
        report += authKeys.stdout + '\n\n';

        // 5. Check withdraw-now.mjs content
        console.log('[5/12] Checking withdraw-now.mjs...');
        const withdrawScript = await ssh.execCommand('cat /root/automaton/withdraw-now.mjs 2>/dev/null');
        report += `=== 💸 withdraw-now.mjs CONTENT ===\n`;
        report += (withdrawScript.stdout || '(file not found)') + '\n\n';

        // 6. Check /tmp/try-withdraw.mjs content
        console.log('[6/12] Checking /tmp/try-withdraw.mjs...');
        const tmpWithdraw = await ssh.execCommand('cat /tmp/try-withdraw.mjs 2>/dev/null');
        report += `=== 💸 /tmp/try-withdraw.mjs CONTENT ===\n`;
        report += (tmpWithdraw.stdout || '(file not found)') + '\n\n';

        // 7. .env file content (REDACTED — check what's exposed)
        console.log('[7/12] Checking .env exposure...');
        const envContent = await ssh.execCommand('wc -c /root/automaton/.env; echo "---"; head -c 20 /root/automaton/.env; echo "...REDACTED"');
        report += `=== 🔐 .ENV FILE SIZE & PREVIEW ===\n`;
        report += envContent.stdout + '\n\n';

        // 8. Check ALL files modified by the attacker's session window (May 2 15:38 - 16:00)
        console.log('[8/12] Files modified during attacker window (May 2 15:30-16:30)...');
        const attackerFiles = await ssh.execCommand('find / -newer /root/.ssh/authorized_keys -not -newer /root/.pm2/logs/HypeKing-out.log -type f 2>/dev/null | grep -v "/proc\\|/sys\\|/dev" | head -50');
        report += `=== 📂 FILES MODIFIED DURING ATTACKER WINDOW ===\n`;
        report += (attackerFiles.stdout || '(none found)') + '\n\n';

        // 9. Check syslog for any commands run
        console.log('[9/12] Checking syslog...');
        const syslog = await ssh.execCommand('grep -E "May  2 15:3[89]|May  2 15:4|May  2 15:5|May  2 16:0" /var/log/syslog 2>/dev/null | head -50');
        report += `=== 📝 SYSLOG DURING ATTACK WINDOW (May 2 15:38-16:00) ===\n`;
        report += (syslog.stdout || '(no relevant entries)') + '\n\n';

        // 10. Node/npm command history, .node_repl_history
        console.log('[10/12] Checking node REPL history...');
        const nodeHist = await ssh.execCommand('cat /root/.node_repl_history 2>/dev/null; echo "---"; cat /root/.lesshst 2>/dev/null; echo "---"; cat /root/.viminfo 2>/dev/null | head -30');
        report += `=== 📜 NODE REPL / EDITOR HISTORY ===\n`;
        report += (nodeHist.stdout || '(empty)') + '\n\n';

        // 11. Check if anyone ran node scripts recently (from pm2 logs around attack time)
        console.log('[11/12] PM2 logs around attack time...');
        const pm2Attack = await ssh.execCommand('grep -A2 -B2 "May  2 15:3\\|May  2 15:4\\|May  2 16:" /root/.pm2/pm2.log 2>/dev/null | tail -50');
        report += `=== 📋 PM2 LOG AROUND ATTACK TIME ===\n`;
        report += (pm2Attack.stdout || '(no entries)') + '\n\n';

        // 12. Check all log files for the suspicious IP
        console.log('[12/12] Global search for attacker IPs...');
        const globalSearch = await ssh.execCommand('grep -rn "77.35.193.51\\|185.115.37.43" /var/log/ 2>/dev/null | head -30');
        report += `=== 🔍 GLOBAL LOG SEARCH FOR ATTACKER IPs ===\n`;
        report += (globalSearch.stdout || '(no additional entries)') + '\n\n';

        // 13. BONUS: Check if multi-sig was set on Hyperliquid
        console.log('[BONUS] Checking for multi-sig related activity...');
        const multiSig = await ssh.execCommand('grep -ri "multi-sig\\|multisig\\|multi_sig\\|setReferrer\\|authorize\\|agent" /root/.pm2/logs/HypeKing-out.log /root/.pm2/logs/HypeKing-err.log 2>/dev/null | tail -30');
        report += `=== 🔗 MULTI-SIG RELATED LOG ENTRIES ===\n`;
        report += (multiSig.stdout || '(no entries)') + '\n\n';

        // 14. BONUS: Who is currently connected
        console.log('[BONUS] Current connections...');
        const currentConn = await ssh.execCommand('who -a; echo "---"; ss -tnp | grep ESTAB');
        report += `=== 👁️ CURRENT ACTIVE CONNECTIONS ===\n`;
        report += currentConn.stdout + '\n\n';

        // 15. Check if there were any outgoing connections from the VPS to external APIs (withdrawal)
        console.log('[BONUS] Checking for outgoing API calls...');
        const outgoing = await ssh.execCommand('grep -rn "withdraw\\|transfer\\|send" /root/.pm2/logs/ 2>/dev/null | tail -20');
        report += `=== 💰 WITHDRAW/TRANSFER LOG ENTRIES ===\n`;
        report += (outgoing.stdout || '(no entries)') + '\n\n';

        report += `\n${'='.repeat(60)}\n`;
        report += `Forensic audit completed at: ${new Date().toISOString()}\n`;

        const reportPath = '../vps_forensic_report.txt';
        fs.writeFileSync(reportPath, report);
        console.log(`\n✅ FORENSIC REPORT SAVED to ${reportPath}`);
        console.log(`Report size: ${(report.length / 1024).toFixed(1)} KB`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Forensic Audit Failed:', err.message);
        process.exit(1);
    }
}

forensicAudit();
