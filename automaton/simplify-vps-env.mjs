import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function simplifyVpsEnv() {
    try {
        await ssh.connect({
            host: 'server021294638',
            username: 'root',
            password: '@venged7XXgg32',
            readyTimeout: 20000
        });
        
        console.log('🗝️  Reading wallet from VPS...');
        const walletRes = await ssh.execCommand('cat /root/.automaton/wallet.json');
        const wallet = JSON.parse(walletRes.stdout);
        const pk = wallet.privateKey;

        // Simplified content
        const envContent = `PRIVATE_KEY=${pk}\nTELEGRAM_BOT_TOKEN=\nTELEGRAM_CHAT_ID=`;
        
        console.log('📝 Overwriting VPS .env with simplified version...');
        await ssh.execCommand(`echo "${envContent}" > /root/automaton/.env`);

        // Also upload the updated JS file (re-compiled)
        // Wait, I should re-build locally first? 
        // No, I'll just upload the TS and rebuild on VPS.
        console.log('📤 Uploading updated loop logic...');
        await ssh.putFile('c:/Users/apilp/.gemini/antigravity/scratch/HyperScalperX/automaton/src/survival/hype-king-loop.ts', '/root/automaton/src/survival/hype-king-loop.ts');

        console.log('🏗️  Re-building and restarting...');
        await ssh.execCommand('npm run build', { cwd: '/root/automaton' });
        await ssh.execCommand('pm2 restart HypeKing');

        console.log('✅ VPS .env simplified and bot restarted.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

simplifyVpsEnv();
