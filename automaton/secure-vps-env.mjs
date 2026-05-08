import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function secureEnv() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        
        // Read current .env
        const currentEnv = await ssh.execCommand('cat /root/automaton/.env');
        let envContent = currentEnv.stdout;

        // Add security if not present
        if (!envContent.includes('DASHBOARD_USER')) {
            envContent += '\n# Dashboard Security\nDASHBOARD_USER=admin\nDASHBOARD_PASS=HypeKing_Secure_!99\n';
            await ssh.execCommand(`echo '${envContent}' > /root/automaton/.env`);
            console.log('✅ Dashboard credentials added to .env');
        } else {
            console.log('ℹ️ Dashboard credentials already exist in .env');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Security Update Failed:', err.message);
        process.exit(1);
    }
}

secureEnv();
