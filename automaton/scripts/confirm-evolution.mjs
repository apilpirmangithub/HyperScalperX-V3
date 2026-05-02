const API_KEY = "cnwy_k_OPMvWR-RJAAOQtsES1gKINkPyj-iSrHl";
const SANDBOX_ID = "d2d07903f3caa0fdc68eef1acdbc4a9a";

async function runExec(command, timeout = 30000) {
    const res = await fetch(`https://api.conway.tech/v1/sandboxes/${SANDBOX_ID}/exec`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify({ command, timeout })
    });
    return await res.json();
}

async function main() {
    console.log("Searching for evolution parameters in log...");
    const evolveLogs = await runExec("grep -a \"evolve_trading_params\" /root/.automaton/logs/agent.log");
    console.log("Evolution activity:");
    console.log(evolveLogs.stdout || "No evolution calls found yet.");

    console.log("\nSearching for 'Parameters evolved' message...");
    const evolvedMsgs = await runExec("grep -a \"Parameters evolved\" /root/.automaton/logs/agent.log");
    console.log("Evolution success signals:");
    console.log(evolvedMsgs.stdout || "No success signals found.");

    console.log("\nChecking KV store for overrides one last time...");
    const kv = await runExec("node -e \"const Database = require('/root/automaton/node_modules/better-sqlite3/lib/index.js'); const db = new Database('/root/.automaton/state.db'); console.log(JSON.stringify(db.prepare('SELECT key, value FROM kv WHERE key LIKE \\'hk_%\\'').all())); db.close();\"");
    console.log(kv.stdout);
}

main().catch(console.error);
