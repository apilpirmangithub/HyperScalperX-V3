const fs = require('fs');

const key = 'cnwy_k_OPMvWR-RJAAOQtsES1gKINkPyj-iSrHl';
const sid = '592b803fed4cd930a686de5fad1800ef';

async function upload() {
    console.log("1. Preparing dist.tar...");
    const content = fs.readFileSync('c:/Users/apilp/.gemini/antigravity/scratch/HyperScalperX/automaton/dist.tar').toString('base64');
    
    console.log("2. Uploading dist.tar to sandbox...");
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

    console.log("3. Extracting and restarting hyperscalper...");
    const command = `cd /root/automaton && tar -xf dist.tar && rm dist.tar && pm2 restart hyperscalper && sleep 2 && pm2 logs hyperscalper --lines 20 --nostream`;
    
    const execRes = await fetch(`https://api.conway.tech/v1/sandboxes/${sid}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ command, timeout: 30000 })
    });
    
    const data = await execRes.json();
    console.log(data.stdout || data.stderr || "No output");
    console.log("\n✅ Precision RR Upgrade deployed!");
}

upload().catch(console.error);
