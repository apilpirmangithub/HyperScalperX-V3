const API_KEY = 'cnwy_k_OPMvWR-RJAAOQtsES1gKINkPyj-iSrHl';
const API_URL = 'https://api.conway.tech/v1';

async function listSandboxes() {
    const r = await fetch(`${API_URL}/sandboxes`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${API_KEY}`
        }
    });
    const d = await r.json();
    console.log(JSON.stringify(d, null, 2));
}

listSandboxes().catch(err => console.error(err));
