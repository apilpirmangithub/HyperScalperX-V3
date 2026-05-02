import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';

const ssh = new NodeSSH();

async function updateVpsToEnv() {
    try {
        await ssh.connect({
            host: 'server021294638',
            username: 'root',
            password: '@venged7XXgg32',
            readyTimeout: 20000
        });
        console.log('✅ Connected to VPS');

        const REMOTE_DIR = '/root/automaton';
        const LOCAL_DIR = 'c:/Users/apilp/.gemini/antigravity/scratch/HyperScalperX/automaton';

        // 1. Get existing Private Key from VPS wallet.json before we do anything
        console.log('🗝️  Backing up wallet data from VPS...');
        const walletDataRes = await ssh.execCommand(`cat ${REMOTE_DIR}/wallet.json`);
        let privateKey = "";
        try {
            const wallet = JSON.parse(walletDataRes.stdout);
            privateKey = wallet.privateKey;
        } catch (e) {
            console.log('⚠️ Could not parse wallet.json on VPS, searching other sources...');
        }

        // 2. Upload updated core files
        const filesToUpload = [
            'package.json',
            'src/index.ts',
            'src/identity/wallet.ts',
            'src/survival/hype-king-loop.ts',
            'src/survival/hyperliquid.ts',
            'src/types.ts',
            'README.md'
        ];

        for (const file of filesToUpload) {
            console.log(`📤 Uploading ${file}...`);
            await ssh.putFile(path.join(LOCAL_DIR, file), `${REMOTE_DIR}/${file}`);
        }

        // 3. Install dependencies (dotenv)
        console.log('📦 Installing new dependencies on VPS...');
        await ssh.execCommand('npm install', { cwd: REMOTE_DIR });

        // 4. Build
        console.log('🏗️  Building project on VPS...');
        await ssh.execCommand('npm run build', { cwd: REMOTE_DIR });

        // 5. Create .env on VPS
        if (privateKey) {
            console.log('📝 Creating .env file on VPS...');
            const envContent = `PRIVATE_KEY=${privateKey}\nTRADING_LEVERAGE=10\nMARGIN_PORTION=0.40\nTRAILING_START=1.7\nTRAILING_CALLBACK=0.5`;
            await ssh.execCommand(`echo "${envContent}" > ${REMOTE_DIR}/.env`);
        } else {
            console.log('⚠️ No Private Key found to populate .env automatically.');
        }

        // 6. Restart PM2
        console.log('🔄 Restarting HypeKing in PM2...');
        await ssh.execCommand('pm2 restart HypeKing');

        console.log('\n✨ VPS SUCCESSFULLY UPDATED TO FULL .ENV VERSION ✨');
        process.exit(0);
    } catch (err) {
        console.error('❌ Update Failed:', err.message);
        process.exit(1);
    }
}

updateVpsToEnv();
