import { NodeSSH } from 'node-ssh';
import path from 'path';
import os from 'os';

const ssh = new NodeSSH();

const VPS_HOST = '82.25.62.152';
const VPS_USER = 'root';
const VPS_PASS = '@Avenged7XX';

async function uploadIdentity() {
    try {
        console.log(`Connecting to new VPS: ${VPS_HOST}...`);
        await ssh.connect({
            host: VPS_HOST,
            username: VPS_USER,
            password: VPS_PASS,
            tryKeyboard: true
        });
        console.log('✅ Connected!');

        const remoteDir = '/root/.automaton';
        console.log(`📁 Creating remote directory ${remoteDir}...`);
        await ssh.execCommand(`mkdir -p ${remoteDir}`);

        const home = os.homedir();
        const dots = path.join(home, '.automaton');
        
        console.log('📤 Uploading identity files...');
        
        // Only uploading essential config files to start fast
        const filesToUpload = [
            'automaton.json',
            'config.json',
            'wallet.json',
            'SOUL.md',
            'constitution.md',
            'heartbeat.yml',
            'partners.json'
        ];

        for (const file of filesToUpload) {
            console.log(`Uploading ${file}...`);
            await ssh.putFile(path.join(dots, file), `${remoteDir}/${file}`).catch(e => console.error(`Skipped ${file}`));
        }
        
        console.log('📤 Uploading state database (this might take a minute)...');
        await ssh.putFile(path.join(dots, 'state.db'), `${remoteDir}/state.db`).catch(e => console.error('Skipped state.db'));

        console.log('🔄 Restarting HypeKing...');
        await ssh.execCommand('pm2 restart HypeKing');

        console.log('🚀 DONE!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Upload Failed:', err);
        process.exit(1);
    }
}

uploadIdentity();
