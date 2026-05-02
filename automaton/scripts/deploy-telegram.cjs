const fs = require('fs');
const { execSync } = require('child_process');

const key = 'cnwy_k_OPMvWR-RJAAOQtsES1gKINkPyj-iSrHl';
const sid = '592b803fed4cd930a686de5fad1800ef';
const TELEGRAM_BOT_TOKEN = '8721984373:AAEm2ygdCrBYMhOsrzRWgPctrU2v8Oy4hIA';
const TELEGRAM_CHAT_ID = '6080564982';

async function deploy() {
    console.log("1. Creating dist tarball...");
    execSync('tar -cf dist.tar dist', { cwd: 'c:/Users/apilp/.gemini/antigravity/scratch/HyperScalperX/automaton' });
    
    console.log("2. Uploading dist tarball...");
    const content = fs.readFileSync('c:/Users/apilp/.gemini/antigravity/scratch/HyperScalperX/automaton/dist.tar').toString('base64');
    const uploadRes = await fetch(`https://api.conway.tech/v1/sandboxes/${sid}/files/upload/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ path: '/root/automaton/dist.tar', content, encoding: 'base64' })
    });
    
    if (!uploadRes.ok) {
        console.error("Upload failed:", await uploadRes.text());
        return;
    }
    console.log("   Upload OK!");

    console.log("3. Extracting and restarting PM2 with Telegram env...");
    const command = `cd /root/automaton && tar -xf dist.tar && rm dist.tar && export CONWAY_API_KEY="${key}" && export TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}" && export TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID}" && pm2 delete all || true && pm2 start dist/index.js --name hyperscalper --update-env -- --run && sleep 5 && pm2 logs hyperscalper --lines 30 --nostream`;
    
    const execRes = await fetch(`https://api.conway.tech/v1/sandboxes/${sid}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ command, timeout: 30000 })
    });
    
    const data = await execRes.json();
    console.log(data.stdout || data.stderr || "No output");
    console.log("\n✅ Deployment complete!");
}

deploy().catch(console.error);
