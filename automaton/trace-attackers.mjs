import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function traceAttackers() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Tracing attacker activities\n');

        let report = `🕵️ DETAILED ATTACKER ACTIVITY TRACE\n`;
        report += `${'='.repeat(60)}\n\n`;

        // === IP 77.35.193.51 (RUSSIA) ===
        report += `${'='.repeat(60)}\n`;
        report += `🇷🇺 IP: 77.35.193.51 (Vladivostok, Rusia)\n`;
        report += `${'='.repeat(60)}\n\n`;

        // 1. ALL auth.log entries for this IP
        const ru_auth = await ssh.execCommand('grep "77.35.193.51" /var/log/auth.log 2>/dev/null');
        report += `=== AUTH LOG (semua entri) ===\n`;
        report += (ru_auth.stdout || '(none)') + '\n\n';

        // 2. Check what processes were started during their session (PID range: 21555-21826)
        // They logged in at 15:38:34 (PID 21555) and disconnected at 15:40:44
        const ru_session = await ssh.execCommand('grep -E "May  2 15:3[89]|May  2 15:40" /var/log/auth.log 2>/dev/null');
        report += `=== AUTH LOG during session window (15:38-15:41) ===\n`;
        report += (ru_session.stdout || '(none)') + '\n\n';

        // 3. Check syslog during Russian IP session
        const ru_syslog = await ssh.execCommand('grep -E "May  2 15:3[89]|May  2 15:40|May  2 15:41" /var/log/syslog 2>/dev/null');
        report += `=== SYSLOG during session ===\n`;
        report += (ru_syslog.stdout || '(none)') + '\n\n';

        // 4. Files created/modified during their session (May 2 15:38-15:41)
        const ru_files = await ssh.execCommand('find / -newermt "2026-05-02 15:38:00" ! -newermt "2026-05-02 15:42:00" -type f 2>/dev/null | grep -v "/proc\\|/sys\\|/dev\\|/run"');
        report += `=== FILES CREATED/MODIFIED (15:38-15:42 May 2) ===\n`;
        report += (ru_files.stdout || '(none found)') + '\n\n';

        // 5. Check authorized_keys modification time precisely
        const ak_stat = await ssh.execCommand('stat /root/.ssh/authorized_keys 2>/dev/null');
        report += `=== authorized_keys STAT ===\n`;
        report += ak_stat.stdout + '\n\n';

        // 6. Check if any new SSH keys were generated on the VPS
        const ssh_keys = await ssh.execCommand('ls -la /root/.ssh/ 2>/dev/null');
        report += `=== /root/.ssh/ DIRECTORY ===\n`;
        report += ssh_keys.stdout + '\n\n';

        // 7. Check kern.log and ufw.log during Russian session
        const ru_kern = await ssh.execCommand('grep -E "May  2 15:3[89]|May  2 15:40" /var/log/kern.log 2>/dev/null | head -20');
        report += `=== KERN LOG during session ===\n`;
        report += (ru_kern.stdout || '(none)') + '\n\n';

        // 8. Check if ufw was modified during session
        const ru_ufw = await ssh.execCommand('grep -E "May  2 15:" /var/log/ufw.log 2>/dev/null | head -20');
        report += `=== UFW LOG May 2 ===\n`;
        report += (ru_ufw.stdout || '(none)') + '\n\n';

        // === IP 185.115.37.43 (UKRAINE) ===
        report += `\n${'='.repeat(60)}\n`;
        report += `🇺🇦 IP: 185.115.37.43 (Uzhhorod, Ukraina)\n`;
        report += `${'='.repeat(60)}\n\n`;

        // 1. ALL auth.log entries
        const ua_auth = await ssh.execCommand('grep "185.115.37.43" /var/log/auth.log 2>/dev/null');
        report += `=== AUTH LOG (semua entri) ===\n`;
        report += (ua_auth.stdout || '(none)') + '\n\n';

        // 2. Check what happened after Ukrainian login (18:29 onwards)
        const ua_session = await ssh.execCommand('grep -E "May  3 18:2[89]|May  3 18:3|May  3 18:4|May  3 18:5|May  3 19:0" /var/log/auth.log 2>/dev/null');
        report += `=== AUTH LOG during session (18:29 onwards) ===\n`;
        report += (ua_session.stdout || '(none)') + '\n\n';

        // 3. Files created/modified after Ukrainian login
        const ua_files = await ssh.execCommand('find / -newermt "2026-05-03 18:29:00" ! -newermt "2026-05-03 19:15:00" -type f 2>/dev/null | grep -v "/proc\\|/sys\\|/dev\\|/run"');
        report += `=== FILES CREATED/MODIFIED (18:29-19:15 May 3) ===\n`;
        report += (ua_files.stdout || '(none found)') + '\n\n';

        // 4. Syslog during Ukrainian session
        const ua_syslog = await ssh.execCommand('grep -E "May  3 18:2[89]|May  3 18:3|May  3 18:4|May  3 18:5|May  3 19:0" /var/log/syslog 2>/dev/null | head -30');
        report += `=== SYSLOG during session ===\n`;
        report += (ua_syslog.stdout || '(none)') + '\n\n';

        // 5. Check if Ukrainian IP is STILL connected
        const ua_still = await ssh.execCommand('who; echo "---"; ss -tnp | grep "185.115.37.43"');
        report += `=== IS UKRAINIAN IP STILL CONNECTED? ===\n`;
        report += ua_still.stdout + '\n\n';

        // 6. What did they access? Check for .env reads
        const env_access = await ssh.execCommand('stat /root/automaton/.env 2>/dev/null | grep Access');
        report += `=== .ENV ACCESS TIME ===\n`;
        report += (env_access.stdout || '(unknown)') + '\n\n';

        // 7. wallet.json access
        const wallet_access = await ssh.execCommand('stat /root/.automaton/wallet.json 2>/dev/null; echo "---"; ls -la /root/.automaton/ 2>/dev/null');
        report += `=== WALLET.JSON STATUS ===\n`;
        report += (wallet_access.stdout || '(not found)') + '\n\n';

        // 8. Check all processes started by the attacker sessions
        const procs = await ssh.execCommand('ps auxf | grep -A5 "sshd.*pts"');
        report += `=== ACTIVE SSH PROCESS TREE ===\n`;
        report += procs.stdout + '\n\n';

        // 9. Check lastlog
        const lastlog = await ssh.execCommand('lastlog 2>/dev/null');
        report += `=== LASTLOG ===\n`;
        report += (lastlog.stdout || '(none)') + '\n\n';

        // 10. Check wtmp for login/logout timestamps
        const wtmp = await ssh.execCommand('last -i -20 2>/dev/null || last -20');
        report += `=== LAST 20 LOGIN/LOGOUT ===\n`;
        report += wtmp.stdout + '\n\n';

        report += `\nTrace completed at: ${new Date().toISOString()}\n`;

        const reportPath = '../vps_attacker_trace.txt';
        fs.writeFileSync(reportPath, report);
        console.log(`\n✅ ATTACKER TRACE SAVED to ${reportPath} (${(report.length/1024).toFixed(1)} KB)`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err.message);
        process.exit(1);
    }
}

traceAttackers();
