const API_KEY = 'cnwy_k_OPMvWR-RJAAOQtsES1gKINkPyj-iSrHl';
const SANDBOX_ID = '592b803fed4cd930a686de5fad1800ef';
const API_URL = 'https://api.conway.tech/v1';

async function exec(command) {
    const r = await fetch(`${API_URL}/sandboxes/${SANDBOX_ID}/exec`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ command, timeout: 30000 })
    });
    const d = await r.json();
    return d;
}

async function main() {
    console.log("--- Triggering Audit ---");
    const triggerRes = await exec("sqlite3 /root/.automaton/state.db \"INSERT OR REPLACE INTO kv (key, value) VALUES ('wake_request', '[AUDIT_TRIGGER]');\"");
    console.log("Trigger response:", JSON.stringify(triggerRes));
    
    console.log("\nWaiting for audit to process (5s)...");
    await new Promise(r => setTimeout(r, 5000));

    console.log("\n--- PM2 Status ---");
    const pm2List = await exec("pm2 list");
    console.log(pm2List.stdout || pm2List.stderr || "No output");

    console.log("\n--- Recent Logs (HypeKing) ---");
    const logs = await exec("pm2 logs HypeKing --lines 100 --nostream");
    console.log(logs.stdout || "No stdout");
    if (logs.stderr) console.log("Stderr:", logs.stderr);

    console.log("\n--- Recent KV Data ---");
    const kv = await exec("sqlite3 /root/.automaton/state.db \"SELECT key, value FROM kv ORDER BY key DESC LIMIT 20;\"");
    console.log(kv.stdout || "No KV data");
    
    console.log("\n--- DB Sizes ---");
    const sizes = await exec("ls -lh /root/.automaton/state.db /root/.openclaw/state.db");
    console.log(sizes.stdout || "No size info");
}

main().catch(err => console.error(err));
