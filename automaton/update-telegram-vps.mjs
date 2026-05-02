import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function updateTelegramVps() {
    try {
        await ssh.connect({
            host: 'server021294638',
            username: 'root',
            password: '@venged7XXgg32',
            readyTimeout: 20000
        });
        
        console.log('📤 Uploading updated telegram logic...');
        await ssh.putFile('c:/Users/apilp/.gemini/antigravity/scratch/HyperScalperX/automaton/src/survival/telegram.ts', '/root/automaton/src/survival/telegram.ts');

        console.log('🏗️  Re-building and restarting...');
        await ssh.execCommand('npm run build', { cwd: '/root/automaton' });
        await ssh.execCommand('pm2 restart HypeKing');

        console.log('🔎 Checking logs for Telegram status...');
        await new Promise(r => setTimeout(r, 5000)); // Wait for bot to start
        const logs = await ssh.execCommand('tail -n 20 /root/.pm2/logs/HypeKing-out.log');
        console.log(logs.stdout);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateTelegramVps();
