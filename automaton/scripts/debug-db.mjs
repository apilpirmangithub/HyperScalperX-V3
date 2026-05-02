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
    console.log("Checking database file in sandbox...");
    const ls = await runExec("ls -l /root/.automaton/state.db");
    console.log("ls result:", ls.stdout);

    console.log("\nListing keys in KV table...");
    const keys = await runExec("node -e \"const Database = require('/root/automaton/node_modules/better-sqlite3/lib/index.js'); const db = new Database('/root/.automaton/state.db'); console.log(db.prepare('SELECT key FROM kv').all()); db.close();\"");
    console.log(keys.stdout);
}

main().catch(console.error);
