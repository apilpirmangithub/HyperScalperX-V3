import { NodeSSH } from 'node-ssh';
import { execSync } from 'child_process';
import path from 'path';

const ssh = new NodeSSH();

async function fixBug() {
    try {
        console.log('🏗️ Building locally...');
        execSync('npm run build', { cwd: process.cwd() });
        console.log('✅ Local build successful!');

        console.log('Connecting to VPS: 82.25.62.152...');
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX'
        });
        console.log('✅ Connected via SSH!');

        const remoteDir = '/root/automaton';

        console.log('📤 Uploading updated dist...');
        await ssh.putDirectory('dist', `${remoteDir}/dist`, {
            recursive: true,
            concurrency: 10
        });
        console.log('✅ files uploaded!');

        console.log('🔧 Fixing database trades with entry_price=0...');
        // If entry_price is 0, we can just delete those open trades so reconcilePositions adopts them again with the right price
        await ssh.execCommand('sqlite3 /root/.automaton/state.db "DELETE FROM trades WHERE status=\'open\' AND entry_price=0;"');
        console.log('✅ Database fixed!');

        console.log('🚀 Restarting HypeKing bot...');
        await ssh.execCommand('pm2 restart HypeKing');

        console.log('🚀 Bug Fix Deployed Successfully!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Deployment Failed:', err);
        process.exit(1);
    }
}

fixBug();
