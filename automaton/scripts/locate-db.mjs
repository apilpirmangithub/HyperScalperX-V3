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
    console.log("Locating all .db files in sandbox...");
    const dbs = await runExec("find / -name \"*.db\" 2>/dev/null");
    console.log("Databases found:");
    console.log(dbs.stdout);

    console.log("\nChecking running automaton process to see which files it has open...");
    // find the pid of the automaton process
    const ps = await runExec("ps aux | grep automaton");
    console.log("Automaton processes:");
    console.log(ps.stdout);

    const pidMatch = ps.stdout.match(/root\s+(\d+)\s+.*node.*index\.js/);
    if (pidMatch) {
        const pid = pidMatch[1];
        console.log(`Found PID: ${pid}`);
        const lsof = await runExec(`ls -l /proc/${pid}/fd`);
        console.log(`Open files for PID ${pid}:`);
        console.log(lsof.stdout);
    } else {
        console.log("Could not find automaton process PID");
    }
}

main().catch(console.error);
