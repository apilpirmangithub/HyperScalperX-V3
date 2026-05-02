import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function fixEnvOnVps() {
    try {
        await ssh.connect({
            host: 'server021294638',
            username: 'root',
            password: '@venged7XXgg32',
            readyTimeout: 20000
        });
        
        console.log('🗝️  Reading correct wallet from ~/.automaton/wallet.json...');
        const walletRes = await ssh.execCommand('cat /root/.automaton/wallet.json');
        const wallet = JSON.parse(walletRes.stdout);
        const pk = wallet.privateKey;

        console.log('📝 Writing .env with real Private Key...');
        const envContent = `PRIVATE_KEY=${pk}\nTRADING_LEVERAGE=10\nMARGIN_PORTION=0.40\nTRAILING_START=1.7\nTRAILING_CALLBACK=0.5`;
        await ssh.execCommand(`echo "${envContent}" > /root/automaton/.env`);

        console.log('🔄 Final Restart...');
        await ssh.execCommand('pm2 restart HypeKing');
        
        console.log('✅ VPS is now running on FULL .ENV with your real wallet!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixEnvOnVps();
