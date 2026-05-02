import { NodeSSH } from 'node-ssh';
import path from 'path';

const ssh = new NodeSSH();

async function deployUpdate() {
    try {
        console.log('Connecting to VPS: server021294638...');
        await ssh.connect({
            host: 'server021294638',
            username: 'root',
            password: '@venged7XXgg32'
        });
        console.log('✅ Connected!');

        const remoteDir = '/root/automaton';
        
        console.log('🏗️ Building project locally...');
        const { execSync } = await import('child_process');
        execSync('npm run build', { cwd: process.cwd() });
        console.log('✅ Local build successful!');

        console.log(`📤 Uploading 'dist' folder to VPS...`);
        await ssh.putDirectory('dist', `${remoteDir}/dist`, {
            recursive: true,
            concurrency: 10
        });
        console.log('✅ dist uploaded!');

        console.log('🔄 Restarting HypeKing bot via PM2...');
        // Match the process name from vps-init-build.mjs or just restart all
        const restartResult = await ssh.execCommand('pm2 restart "HypeKing" || pm2 restart all');
        console.log(restartResult.stdout);

        console.log('🚀 SEI Update Deployed Successfully!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Update Deployment Failed:', err);
        process.exit(1);
    }
}

deployUpdate();
