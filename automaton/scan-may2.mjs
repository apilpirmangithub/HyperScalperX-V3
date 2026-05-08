import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function scanFiles() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Scanning for Intrusion Files (May 2nd)\n');

        // Find files modified on May 2nd
        const cmd = 'find /root /tmp /var/tmp -newermt "2026-05-02 00:00:00" ! -newermt "2026-05-02 23:59:59" -ls 2>/dev/null';
        const result = await ssh.execCommand(cmd);
        
        console.log('=== FILES MODIFIED ON MAY 2nd ===');
        if (result.stdout) {
            console.log(result.stdout);
        } else {
            console.log('(No files found for this date range)');
        }

        // Specifically look for hidden files created recently
        console.log('\n🔍 Scanning for suspicious hidden files in /root...');
        const hiddenFiles = await ssh.execCommand('ls -laR /root | grep "\\." | grep -vE "node_modules|\\.\\.$" | head -n 50');
        console.log(hiddenFiles.stdout);

        process.exit(0);
    } catch (err) {
        console.error('❌ Scan Failed:', err.message);
        process.exit(1);
    }
}

scanFiles();
