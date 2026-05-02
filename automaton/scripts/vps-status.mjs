import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  const results = [];

  // 1. DB trades
  await ssh.execCommand(`cat > /tmp/db_check.js << 'SCRIPT'
const Database = require("/root/automaton/node_modules/better-sqlite3");
const db = new Database("/root/.automaton/state.db");
const open = db.prepare("SELECT * FROM trades WHERE status = 'open'").all();
const recent = db.prepare("SELECT id, market, side, status, pnl_usdc, close_reason, open_time, close_time FROM trades ORDER BY rowid DESC LIMIT 20").all();
console.log(JSON.stringify({ open, recent }));
db.close();
SCRIPT`);
  const dbRes = await ssh.execCommand('node /tmp/db_check.js');
  results.push('=== DB ===');
  results.push(dbRes.stdout || dbRes.stderr);

  // 2. HL positions
  await ssh.execCommand(`cat > /tmp/hl_check.mjs << 'SCRIPT'
import { initHyperliquid, getOpenPositions, getBalance } from '/root/automaton/dist/survival/hyperliquid.js';
await initHyperliquid();
const positions = await getOpenPositions();
const bal = await getBalance();
console.log(JSON.stringify({ positions, balance: bal }));
process.exit(0);
SCRIPT`);
  const hlRes = await ssh.execCommand('node /tmp/hl_check.mjs');
  results.push('=== HL ===');
  results.push(hlRes.stdout || hlRes.stderr);

  // 3. PM2 + Logs
  const pm2Res = await ssh.execCommand('pm2 jlist');
  results.push('=== PM2 ===');
  try {
    const procs = JSON.parse(pm2Res.stdout);
    for (const p of procs) {
      results.push(`${p.name}: ${p.pm2_env.status} | uptime: ${Math.round((Date.now() - p.pm2_env.pm_uptime) / 60000)}min | restarts: ${p.pm2_env.restart_time}`);
    }
  } catch { results.push(pm2Res.stdout || pm2Res.stderr); }

  const logRes = await ssh.execCommand('pm2 logs HypeKing --lines 25 --nostream');
  results.push('=== LOGS ===');
  results.push(logRes.stdout);

  ssh.dispose();

  // Write clean UTF-8 file
  fs.writeFileSync('vps_status.json', results.join('\n'), 'utf8');
  console.log('Done. Written to vps_status.json');
}

run().catch(console.error);
