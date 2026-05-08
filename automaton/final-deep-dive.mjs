import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function finalDeepDive() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Final Deep Dive Starting\n');

        // 1. Get all successful logins in the last 7 days
        console.log('🚪 Auditing All Successful Logins (Last 7 Days)...');
        const logins = await ssh.execCommand('grep "Accepted" /var/log/auth.log*');
        console.log('=== SUCCESSFUL LOGINS ===');
        console.log(logins.stdout || '(No successful login records found)');

        // 2. Check for unusual activities in syslog (last 500 lines)
        console.log('\nsystemd Checking system logs for errors or suspicious restarts...');
        const syslog = await ssh.execCommand('tail -n 500 /var/log/syslog | grep -E "session|error|fail"');
        console.log('=== SUSPICIOUS SYSLOG ENTRIES ===');
        console.log(syslog.stdout || '(No major issues found in syslog)');

        // 3. Check .ssh directory for any leftover keys
        console.log('\n🔑 Checking SSH keys directory...');
        const sshDir = await ssh.execCommand('ls -la /root/.ssh');
        console.log('=== .SSH DIRECTORY CONTENT ===');
        console.log(sshDir.stdout);

        process.exit(0);
    } catch (err) {
        console.error('❌ Final Dive Failed:', err.message);
        process.exit(1);
    }
}

finalDeepDive();
