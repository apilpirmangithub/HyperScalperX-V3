import { NodeSSH } from 'node-ssh';
import path from 'path';
import { execSync } from 'child_process';

const ssh = new NodeSSH();

const VPS_HOST = '82.25.62.152';
const VPS_USER = 'root';
const VPS_PASS = '@Avenged7XX';

async function deployNewVPS() {
    try {
        console.log(`Connecting to new VPS: ${VPS_HOST}...`);
        await ssh.connect({
            host: VPS_HOST,
            username: VPS_USER,
            password: VPS_PASS,
            tryKeyboard: true,
            readyTimeout: 20000
        });
        console.log('✅ Connected via SSH!');

        console.log('🔄 Updating system and installing dependencies (curl, git, nodejs)...');
        await ssh.execCommand('apt-get update -y && apt-get install -y curl git build-essential');
        
        console.log('🟢 Installing Node.js 20...');
        await ssh.execCommand('curl -fsSL https://deb.nodesource.com/setup_20.x | bash -');
        await ssh.execCommand('apt-get install -y nodejs');
        
        console.log('📦 Installing PM2 globally...');
        await ssh.execCommand('npm install -g pm2');

        const remoteDir = '/root/automaton';
        console.log(`📁 Creating remote directory ${remoteDir}...`);
        await ssh.execCommand(`mkdir -p ${remoteDir}`);

        console.log('🏗️ Building project locally...');
        execSync('npm run build', { cwd: process.cwd() });
        console.log('✅ Local build successful!');

        console.log('📤 Uploading project files (package.json, dist)...');
        // Upload package.json
        await ssh.putFile('package.json', `${remoteDir}/package.json`);
        
        // Ensure .env is uploaded, handling missing .env if necessary by copying .env.example
        const fs = await import('fs');
        if (fs.existsSync('.env')) {
            await ssh.putFile('.env', `${remoteDir}/.env`);
        } else if (fs.existsSync('.env.example')) {
            console.log('⚠️ .env not found, uploading .env.example as .env');
            await ssh.putFile('.env.example', `${remoteDir}/.env`);
        }

        // Upload dist directory
        await ssh.putDirectory('dist', `${remoteDir}/dist`, {
            recursive: true,
            concurrency: 10
        });
        console.log('✅ files uploaded!');

        console.log('📦 Installing npm dependencies on VPS...');
        const npmInstallRes = await ssh.execCommand('npm install --omit=dev', { cwd: remoteDir });
        console.log(npmInstallRes.stdout);
        if (npmInstallRes.stderr) console.error(npmInstallRes.stderr);

        console.log('🚀 Starting HypeKing bot via PM2...');
        await ssh.execCommand('pm2 delete all || true');
        const startResult = await ssh.execCommand('pm2 start dist/index.js --name "HypeKing"', { cwd: remoteDir });
        console.log(startResult.stdout);
        
        await ssh.execCommand('pm2 save');
        await ssh.execCommand('pm2 startup');

        console.log('🚀 DEPLOYMENT COMPLETED SUCCESSFULLY!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Deployment Failed:', err);
        process.exit(1);
    }
}

deployNewVPS();
