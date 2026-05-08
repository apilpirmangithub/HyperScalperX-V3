import { NodeSSH } from 'node-ssh';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ssh = new NodeSSH();

async function deploy() {
  try {
    console.log("🚀 Starting Deployment to VPS (Binance Migration)...");

    await ssh.connect({
      host: '82.25.62.152',
      username: 'root',
      password: '@Avenged7XX',
      readyTimeout: 30000
    });
    console.log("✅ Connected to VPS.");

    const remoteDir = '/root/automaton';

    // 1. Update .env content
    const envContent = `
EXCHANGE_TYPE=binance
BINANCE_API_KEY=aj0RserTmOl5qKETxg6A9hdx8nrVYoQL7HJJluqB6VOkEgZIdrKw5S4XDGzA2xJL
BINANCE_API_SECRET=7wtdXn80ajSyG6J9JQ07gbYj6NMJMPaL3uRF0fQdtHlHLM2GoKIShcaeHECpyuu4
PRIVATE_KEY=0x814c530441f330b9d1AcD51D308aEa81df6E73eD
TELEGRAM_BOT_TOKEN=8721984373:AAEm2ygdCrBYMhOsrzRWgPctrU2v8Oy4hIA
TELEGRAM_CHAT_ID=6080564982
FIREBASE_SERVICE_ACCOUNT=/root/firebase-key.json
FIREBASE_DB_URL=https://mytradingbot-e4f0d-default-rtdb.firebaseio.com
`.trim();

    console.log("📝 Updating .env on VPS...");
    await ssh.execCommand(`echo "${envContent}" > ${remoteDir}/.env`);

    console.log("📤 Uploading Firebase Key...");
    await ssh.putFile('./firebase-key.json', '/root/firebase-key.json');

    // 2. Build locally and upload dist
    // console.log("🏗️ Building locally...");
    // execSync('npm run build', { cwd: './automaton' });
    
    console.log("📤 Uploading updated dist and package files...");
    await ssh.putDirectory('./dist', `${remoteDir}/dist`, { recursive: true });
    await ssh.putFile('./package.json', `${remoteDir}/package.json`);

    // 3. Install ccxt and other dependencies on VPS
    console.log("⚙️ Installing dependencies on VPS...");
    await ssh.execCommand('npm install ccxt node-ssh @nktkas/hyperliquid viem --omit=dev', { cwd: remoteDir });

    // 4. Restart Bot
    console.log("🔥 Restarting HypeKing via PM2...");
    await ssh.execCommand('pm2 delete HypeKing || true');
    await ssh.execCommand('pm2 start dist/index.js --name "HypeKing"', { cwd: remoteDir });
    await ssh.execCommand('pm2 save');

    console.log("\n✨ DEPLOYMENT TO BINANCE SUCCESSFUL!");
    ssh.dispose();
  } catch (err) {
    console.error("❌ Deployment Failed:", err);
  }
}

deploy();
