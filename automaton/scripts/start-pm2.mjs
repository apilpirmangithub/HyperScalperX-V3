import fs from 'fs';

const key = 'cnwy_k_OPMvWR-RJAAOQtsES1gKINkPyj-iSrHl';
const sid = '592b803fed4cd930a686de5fad1800ef';

async function startPM2() {
    try {
        console.log("Installing pm2 in sandbox and starting agent...");
        
        const command = `npm install -g pm2 && cd /root/automaton && export CONWAY_API_KEY="${key}" && pm2 start dist/index.js --name hyperscalper -- --run && sleep 3 && pm2 logs hyperscalper --lines 30 --nostream`;

        const response = await fetch(`https://api.conway.tech/v1/sandboxes/${sid}/exec`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                command: command,
                timeout: 60000
            })
        });

        const data = await response.json();
        console.log(data.stdout || data.stderr || "No output");
        
        if (data.status === 'ok') {
            console.log("\n✅ PM2 Agent successfully started.");
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

startPM2();
