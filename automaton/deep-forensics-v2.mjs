import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function deepForensicLevel2() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Starting Deep Forensic Level 2\n');

        // 1. Check for unauthorized users
        console.log('👥 Auditing System Users...');
        const users = await ssh.execCommand('cat /etc/passwd | grep "/bin/bash"');
        console.log('=== USERS WITH BASH ACCESS ===');
        console.log(users.stdout);

        // 2. Check for hidden cron jobs (Persistence)
        console.log('\n⏳ Checking for hidden Cron Jobs (Persistence)...');
        const cron = await ssh.execCommand('crontab -l; ls -la /etc/cron.d; cat /etc/crontab');
        console.log('=== CRON JOBS / SCHEDULED TASKS ===');
        console.log(cron.stdout || '(No custom cron jobs found)');

        // 3. Check /var/log/btmp (Failed Logins - Brute Force Trace)
        console.log('\n🚫 Checking Failed Login Attempts (Brute Force)...');
        const failed = await ssh.execCommand('lastb -n 20');
        console.log('=== RECENT FAILED LOGINS ===');
        console.log(failed.stdout || '(No failed login logs available)');

        // 4. Check for hidden files in root directory
        console.log('\n📂 Searching for hidden files in /root...');
        const hiddenFiles = await ssh.execCommand('ls -la /root | grep "^\\." | grep -vE "\\.bash|\\.ssh|\\.$"');
        console.log('=== UNUSUAL HIDDEN FILES ===');
        console.log(hiddenFiles.stdout || '(None found)');

        // 5. Check network listening ports again for "Backdoor" ports
        console.log('\n📡 Checking all listening ports (including non-standard)...');
        const ports = await ssh.execCommand('netstat -tulpn');
        console.log('=== ACTIVE PORTS ===');
        console.log(ports.stdout);

        process.exit(0);
    } catch (err) {
        console.error('❌ Deep Forensic Failed:', err.message);
        process.exit(1);
    }
}

deepForensicLevel2();
