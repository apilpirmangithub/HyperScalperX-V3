import { NodeSSH } from 'node-ssh';
import path from 'path';

const ssh = new NodeSSH();

async function uploadDist() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 20000
        });
        
        console.log('📤 Uploading local dist folder to VPS...');
        // We put the folder recursively
        await ssh.putDirectory('c:/Users/apilp/.gemini/antigravity/scratch/HyperScalperX/automaton/dist', '/root/automaton/dist', {
            recursive: true,
            concurrency: 10
        });

        console.log('🚀 Starting bot on VPS...');
        await ssh.execCommand('pm2 restart HypeKing', { cwd: '/root/automaton' });
        
        console.log('✅ VPS Updated and Started successfully via Local Build.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

uploadDist();
