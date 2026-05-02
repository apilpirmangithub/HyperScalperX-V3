import fs from 'fs';

const API_KEY = "cnwy_k_OPMvWR-RJAAOQtsES1gKINkPyj-iSrHl";
const SANDBOX_ID = "d2d07903f3caa0fdc68eef1acdbc4a9a";

async function run() {
    const res = await fetch(`https://api.conway.tech/v1/sandboxes/${SANDBOX_ID}/exec`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ command: 'cat /root/.automaton/optimization_report.json' })
    });

    const data = await res.json();
    if (data.stdout) {
        fs.writeFileSync('optimization_report.json', data.stdout);
        console.log("Optimization report fetched and saved to optimization_report.json");
    } else {
        console.error("Failed to fetch report:", data.stderr || "No output");
    }
}

run().catch(console.error);
