import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function deepSecurityAudit() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected to VPS for Deep Security Audit\n');

        let report = `🔒 VPS DEEP SECURITY AUDIT - 24 HOURS\n`;
        report += `Timestamp: ${new Date().toISOString()}\n`;
        report += `${'='.repeat(60)}\n\n`;

        // ============================================================
        // 1. SSH LOGIN HISTORY (24 hours) - check who logged in
        // ============================================================
        console.log('[1/15] Checking SSH login history...');
        const sshLogins = await ssh.execCommand('last -i -s "24 hours ago" 2>/dev/null || last -s "-24hours" 2>/dev/null || last -20');
        report += `=== 🔑 SSH LOGIN HISTORY (Last 24h) ===\n`;
        report += sshLogins.stdout + '\n';
        if (sshLogins.stderr) report += `STDERR: ${sshLogins.stderr}\n`;
        report += '\n';

        // ============================================================
        // 2. FAILED SSH ATTEMPTS - brute force detection
        // ============================================================
        console.log('[2/15] Checking failed SSH attempts...');
        const failedSSH = await ssh.execCommand('grep -i "Failed password\\|Invalid user\\|authentication failure" /var/log/auth.log 2>/dev/null | tail -50 || journalctl -u sshd --since "24 hours ago" --no-pager 2>/dev/null | grep -i "failed\\|invalid" | tail -50');
        report += `=== 🚨 FAILED SSH ATTEMPTS (Last 24h) ===\n`;
        report += (failedSSH.stdout || '(no failed attempts found)') + '\n\n';

        // ============================================================
        // 3. SUCCESSFUL SSH SESSIONS from auth log
        // ============================================================
        console.log('[3/15] Checking successful SSH sessions...');
        const successSSH = await ssh.execCommand('grep "Accepted" /var/log/auth.log 2>/dev/null | tail -30 || journalctl -u sshd --since "24 hours ago" --no-pager 2>/dev/null | grep -i "accepted" | tail -30');
        report += `=== ✅ SUCCESSFUL SSH SESSIONS ===\n`;
        report += (successSSH.stdout || '(no recent sessions found in logs)') + '\n\n';

        // ============================================================
        // 4. CURRENTLY LOGGED IN USERS
        // ============================================================
        console.log('[4/15] Checking currently logged in users...');
        const whoResult = await ssh.execCommand('who; echo "---"; w');
        report += `=== 👤 CURRENTLY LOGGED IN USERS ===\n`;
        report += whoResult.stdout + '\n\n';

        // ============================================================
        // 5. ALL RUNNING PROCESSES - check for suspicious ones
        // ============================================================
        console.log('[5/15] Checking running processes...');
        const processes = await ssh.execCommand('ps auxf --sort=-%mem | head -40');
        report += `=== ⚙️ ALL RUNNING PROCESSES (Top 40 by memory) ===\n`;
        report += processes.stdout + '\n\n';

        // Specifically look for crypto miners, reverse shells, suspicious processes
        console.log('[5b/15] Checking for suspicious processes...');
        const suspiciousProcs = await ssh.execCommand('ps aux | grep -iE "miner|xmrig|kswapd|kdevtmpfsi|kinsing|cryptonight|stratum|\.hidden|/tmp/\\.|curl.*sh|wget.*sh|bash -i|nc -|ncat|socat|perl -e|python -c.*socket" | grep -v grep');
        report += `=== 🦠 SUSPICIOUS PROCESS SCAN ===\n`;
        report += (suspiciousProcs.stdout || '✅ No known suspicious processes detected') + '\n\n';

        // ============================================================
        // 6. CRONTAB - check for unauthorized scheduled tasks
        // ============================================================
        console.log('[6/15] Checking crontab entries...');
        const crontab = await ssh.execCommand('crontab -l 2>/dev/null; echo "---SYSTEM CRONS---"; ls -la /etc/cron.d/ 2>/dev/null; echo "---CRON.DAILY---"; ls -la /etc/cron.daily/ 2>/dev/null; echo "---AT JOBS---"; atq 2>/dev/null');
        report += `=== ⏰ SCHEDULED TASKS (Crontab + System Crons) ===\n`;
        report += crontab.stdout + '\n\n';

        // ============================================================
        // 7. NETWORK CONNECTIONS - check for outgoing connections to unknown IPs
        // ============================================================
        console.log('[7/15] Checking network connections...');
        const netstat = await ssh.execCommand('ss -tulnp 2>/dev/null || netstat -tulnp 2>/dev/null');
        report += `=== 🌐 LISTENING PORTS & CONNECTIONS ===\n`;
        report += netstat.stdout + '\n\n';

        // Active established connections
        const established = await ssh.execCommand('ss -tnp state established 2>/dev/null || netstat -tnp 2>/dev/null | grep ESTABLISHED');
        report += `=== 🔗 ESTABLISHED CONNECTIONS ===\n`;
        report += (established.stdout || '(none)') + '\n\n';

        // ============================================================
        // 8. RECENTLY MODIFIED FILES in sensitive directories
        // ============================================================
        console.log('[8/15] Checking recently modified files...');
        const recentFiles = await ssh.execCommand('find /root /etc /usr/local/bin /tmp /var/tmp -mtime -1 -type f 2>/dev/null | head -80');
        report += `=== 📂 FILES MODIFIED IN LAST 24h (Sensitive Dirs) ===\n`;
        report += (recentFiles.stdout || '(none found)') + '\n\n';

        // ============================================================
        // 9. SUSPICIOUS FILES in /tmp and /var/tmp
        // ============================================================
        console.log('[9/15] Checking /tmp and /var/tmp for suspicious files...');
        const tmpFiles = await ssh.execCommand('ls -laR /tmp/ /var/tmp/ /dev/shm/ 2>/dev/null | head -60');
        report += `=== 🗑️ TEMP DIRECTORIES CONTENT ===\n`;
        report += (tmpFiles.stdout || '(empty)') + '\n\n';

        // ============================================================
        // 10. PM2 PROCESS STATUS - bot health
        // ============================================================
        console.log('[10/15] Checking PM2 bot status...');
        const pm2Status = await ssh.execCommand('pm2 jlist');
        try {
            const pm2Data = JSON.parse(pm2Status.stdout);
            report += `=== 🤖 PM2 BOT STATUS ===\n`;
            for (const proc of pm2Data) {
                const uptimeMin = Math.round((Date.now() - proc.pm2_env.pm_uptime) / 1000 / 60);
                report += `Process: ${proc.name}\n`;
                report += `  Status: ${proc.pm2_env.status}\n`;
                report += `  Uptime: ${uptimeMin} minutes (${Math.round(uptimeMin/60)} hours)\n`;
                report += `  Memory: ${Math.round(proc.monit.memory / 1024 / 1024)} MB\n`;
                report += `  CPU: ${proc.monit.cpu}%\n`;
                report += `  Restarts: ${proc.pm2_env.restart_time}\n`;
                report += `  Script: ${proc.pm2_env.pm_exec_path}\n\n`;
            }
        } catch (e) {
            report += `=== 🤖 PM2 STATUS (raw) ===\n`;
            report += pm2Status.stdout + '\n\n';
        }

        // ============================================================
        // 11. PM2 ERROR LOGS (last 24h worth)
        // ============================================================
        console.log('[11/15] Fetching PM2 error logs...');
        const errLogs = await ssh.execCommand('tail -n 200 /root/.pm2/logs/HypeKing-err.log 2>/dev/null');
        report += `=== ⚠️ PM2 ERROR LOGS (Last 200 lines) ===\n`;
        report += (errLogs.stdout || '(no error log found)') + '\n\n';

        // ============================================================
        // 12. PM2 OUTPUT LOGS (last 24h worth)
        // ============================================================
        console.log('[12/15] Fetching PM2 output logs...');
        const outLogs = await ssh.execCommand('tail -n 500 /root/.pm2/logs/HypeKing-out.log 2>/dev/null');
        report += `=== 📋 PM2 OUTPUT LOGS (Last 500 lines) ===\n`;
        report += (outLogs.stdout || '(no output log found)') + '\n\n';

        // ============================================================
        // 13. .env FILE INTEGRITY CHECK
        // ============================================================
        console.log('[13/15] Checking .env file integrity...');
        const envCheck = await ssh.execCommand('stat /root/automaton/.env 2>/dev/null; echo "---"; md5sum /root/automaton/.env 2>/dev/null');
        report += `=== 🔐 .ENV FILE STATUS ===\n`;
        report += (envCheck.stdout || '(.env not found at expected path)') + '\n\n';

        // Also check if .env was accessed/modified recently
        const envAccess = await ssh.execCommand('find /root -name ".env" -mtime -1 2>/dev/null');
        report += `=== .ENV FILES MODIFIED IN LAST 24h ===\n`;
        report += (envAccess.stdout || '(none modified)') + '\n\n';

        // ============================================================
        // 14. SYSTEM SECURITY - firewall, open ports, new users
        // ============================================================
        console.log('[14/15] Checking system security...');
        
        // New user accounts
        const newUsers = await ssh.execCommand('grep -v "nologin\\|false" /etc/passwd');
        report += `=== 👥 USER ACCOUNTS WITH LOGIN SHELL ===\n`;
        report += newUsers.stdout + '\n\n';

        // Firewall status
        const firewall = await ssh.execCommand('ufw status 2>/dev/null || iptables -L -n 2>/dev/null | head -30');
        report += `=== 🛡️ FIREWALL STATUS ===\n`;
        report += (firewall.stdout || '(no firewall info available)') + '\n\n';

        // SSH config - check for security settings
        const sshConfig = await ssh.execCommand('grep -E "PermitRootLogin|PasswordAuthentication|Port |AllowUsers|MaxAuthTries" /etc/ssh/sshd_config 2>/dev/null | grep -v "^#"');
        report += `=== 🔧 SSH CONFIGURATION ===\n`;
        report += (sshConfig.stdout || '(could not read sshd_config)') + '\n\n';

        // ============================================================
        // 15. SYSTEM RESOURCE & DISK STATUS
        // ============================================================
        console.log('[15/15] Checking system resources...');
        const sysInfo = await ssh.execCommand('echo "=== DISK ===" && df -h && echo "\\n=== MEMORY ===" && free -h && echo "\\n=== UPTIME ===" && uptime && echo "\\n=== LAST REBOOT ===" && last reboot | head -5');
        report += `=== 💻 SYSTEM RESOURCES ===\n`;
        report += sysInfo.stdout + '\n\n';

        // ============================================================
        // 16. BONUS: Check for unauthorized keys
        // ============================================================
        console.log('[BONUS] Checking authorized SSH keys...');
        const authKeys = await ssh.execCommand('cat /root/.ssh/authorized_keys 2>/dev/null; echo "---"; wc -l /root/.ssh/authorized_keys 2>/dev/null');
        report += `=== 🔑 AUTHORIZED SSH KEYS ===\n`;
        report += (authKeys.stdout || '(no authorized_keys file)') + '\n\n';

        // ============================================================
        // 17. BONUS: Check bash history for suspicious commands
        // ============================================================
        console.log('[BONUS] Checking bash history...');
        const bashHistory = await ssh.execCommand('tail -100 /root/.bash_history 2>/dev/null');
        report += `=== 📜 RECENT BASH HISTORY (Last 100 commands) ===\n`;
        report += (bashHistory.stdout || '(no bash history)') + '\n\n';

        // ============================================================
        // 18. BONUS: Systemd journal for suspicious services
        // ============================================================
        console.log('[BONUS] Checking systemd journal...');
        const journal = await ssh.execCommand('journalctl --since "24 hours ago" -p err --no-pager 2>/dev/null | tail -50');
        report += `=== 📕 SYSTEM ERRORS (Last 24h) ===\n`;
        report += (journal.stdout || '(no errors in journal)') + '\n\n';

        // ============================================================
        // SAVE REPORT
        // ============================================================
        report += `\n${'='.repeat(60)}\n`;
        report += `Audit completed at: ${new Date().toISOString()}\n`;

        const reportPath = '../vps_security_audit_24h.txt';
        fs.writeFileSync(reportPath, report);
        console.log(`\n✅ FULL SECURITY AUDIT SAVED to ${reportPath}`);
        console.log(`Report size: ${(report.length / 1024).toFixed(1)} KB`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Audit Failed:', err.message);
        process.exit(1);
    }
}

deepSecurityAudit();
