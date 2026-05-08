import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function findFirstIntruder() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Hunting for the First Intruder (May 2nd)\n');

        // Get all successful logins on May 2nd
        const loginCmd = 'grep "Accepted" /var/log/auth.log | grep "May  2"';
        const logins = await ssh.execCommand(loginCmd);
        
        console.log('=== SUCCESSFUL LOGINS ON MAY 2nd ===');
        console.log(logins.stdout || '(No logins found in auth.log - checking backups)');

        if (!logins.stdout) {
            // Check rotated logs if auth.log is too fresh
            const backupLogins = await ssh.execCommand('zgrep "Accepted" /var/log/auth.log.1.gz 2>/dev/null | grep "May  2"');
            console.log('=== BACKUP LOGINS (auth.log.1.gz) ===');
            console.log(backupLogins.stdout || '(None found)');
        }

        // Also check if any web server logs show suspicious activity on port 3000
        console.log('\n🔍 Checking for non-SSH access (Dashboard/API)...');
        const activePorts = await ssh.execCommand('netstat -tulpn');
        console.log('=== ACTIVE PORTS ===');
        console.log(activePorts.stdout);

        process.exit(0);
    } catch (err) {
        console.error('❌ Hunt Failed:', err.message);
        process.exit(1);
    }
}

findFirstIntruder();
