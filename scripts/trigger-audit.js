const https = require('https');

const data = JSON.stringify({
    command: "sqlite3 /root/.automaton/state.db \"INSERT OR REPLACE INTO kv (key, value) VALUES ('wake_request', '[AUDIT_TRIGGER]');\""
});

const options = {
    hostname: 'api.conway.tech',
    port: 443,
    path: '/sandboxes/d2d07903f3caa0fdc68eef1acdbc4a9a/exec',
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${process.env.CONWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    res.on('data', d => {
        process.stdout.write(d);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
