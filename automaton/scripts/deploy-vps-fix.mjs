import { NodeSSH } from 'node-ssh';
import path from 'path';

const ssh = new NodeSSH();
const remoteDir = '/root/automaton';

async function deployFix() {
    try {
        console.log('🚀 Starting VPS Deployment with Circuit Breaker fix...');
        
        await ssh.connect({
            host: 'server021294638',
            username: 'root',
            password: '@venged7XXgg32',
            readyTimeout: 30000
        });

        console.log('📁 Syncing hype-king-loop.ts source...');
        await ssh.putFile(
            './src/survival/hype-king-loop.ts',
            `${remoteDir}/src/survival/hype-king-loop.ts`
        );

        console.log('📁 Uploading compiled dist folder...');
        await ssh.putDirectory('./dist', `${remoteDir}/dist`, {
            recursive: true,
            concurrency: 10
        });

        console.log('🔄 Restarting HypeKing process...');
        await ssh.execCommand('npx pm2 restart HypeKing', { cwd: remoteDir });
        
        console.log('\n✨ DEPLOYMENT SUCCESSFUL!');
        console.log('Bot is now running with the refined Circuit Breaker logic.');
        console.log('Use "pm2 logs HypeKing" on VPS to monitor.');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Deployment Failed:', err);
        process.exit(1);
    }
}

deployFix();
