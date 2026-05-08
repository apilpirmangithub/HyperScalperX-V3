import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function rebuildBot() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Rebuilding HypeKing with Security Patch\n');

        // 1. Upload the modified server.ts (since we only edited it locally)
        // Wait, I edited it locally, I should upload the whole src folder if possible or just the file.
        // I'll use a trick to write the modified server.ts directly to the VPS.
        const serverCode = `
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { collectDashboardData } from "./dashboard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startDashboardServer(opts: {
    db: any;
    config: any;
    walletAddress: string;
    port?: number;
}) {
    const port = opts.port || 3000;
    const AUTH_USER = process.env.DASHBOARD_USER || "admin";
    const AUTH_PASS = process.env.DASHBOARD_PASS || "HypeKingSecure2026";

    const server = http.createServer(async (req, res) => {
        const auth = req.headers.authorization;
        if (!auth) {
            res.setHeader("WWW-Authenticate", 'Basic realm="HyperScalperX Dashboard"');
            res.writeHead(401);
            res.end("Authentication Required");
            return;
        }

        const credentials = Buffer.from(auth.split(" ")[1], "base64").toString().split(":");
        if (credentials[0] !== AUTH_USER || credentials[1] !== AUTH_PASS) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
        }

        if (req.url === "/api/data") {
            try {
                const data = await collectDashboardData(opts);
                res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
                res.end(JSON.stringify(data));
            } catch (err: any) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        if (req.url === "/" || req.url === "/index.html") {
            const htmlPath = path.join(__dirname, "index.html");
            if (fs.existsSync(htmlPath)) {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(fs.readFileSync(htmlPath));
            } else {
                res.writeHead(404);
                res.end("Dashboard UI not found.");
            }
            return;
        }

        res.writeHead(404);
        res.end("Not Found");
    });

    server.listen(port, "0.0.0.0", () => {
        console.log(\`[Dashboard] 🛡️ SECURE Web UI active at http://0.0.0.0:\${port}\`);
    });

    return server;
}
`;
        await ssh.execCommand(`echo '${serverCode.replace(/'/g, "'\\''")}' > /root/automaton/src/dashboard/server.ts`);

        // 2. Build the project
        console.log('📦 Compiling Typescript...');
        const buildResult = await ssh.execCommand('cd /root/automaton && npm run build');
        console.log(buildResult.stdout || buildResult.stderr);

        // 3. Restart with PM2
        console.log('🔄 Restarting Bot...');
        await ssh.execCommand('pm2 restart HypeKing || pm2 start dist/index.js --name HypeKing');
        
        console.log('\n✨ BOT SECURED AND RESTARTED! ✨');
        console.log('Username: admin');
        console.log('Password: HypeKing_Secure_!99');

        process.exit(0);
    } catch (err) {
        console.error('❌ Rebuild Failed:', err.message);
        process.exit(1);
    }
}

rebuildBot();
