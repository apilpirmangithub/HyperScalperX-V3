const API_KEY = "cnwy_k_OPMvWR-RJAAOQtsES1gKINkPyj-iSrHl";
const SANDBOX_ID = "d2d07903f3caa0fdc68eef1acdbc4a9a";

async function getLogs() {
    try {
        console.log(`Checking logs for sandbox: ${SANDBOX_ID}`);
        const res = await fetch(`https://api.conway.tech/v1/sandboxes/${SANDBOX_ID}/exec`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({ command: 'tail -n 500 /root/.automaton/logs/agent.log', timeout: 15000 })
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`HTTP Error: ${res.status} - ${errText}`);
            return;
        }

        const data = await res.json();
        console.log("--- SURVIVAL LOG ---");
        console.log(data.stdout || data.stderr || "No output");
        console.log("--- END ---");
    } catch (e) {
        console.error("Error fetching logs:", e.message);
    }
}

getLogs();
