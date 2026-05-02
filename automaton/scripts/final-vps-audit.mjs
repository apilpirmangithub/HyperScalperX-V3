import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("--- PM2 LIST ---");
  const pm2res = await ssh.execCommand('pm2 status');
  console.log(pm2res.stdout);

  console.log("\n--- LATEST LOGS ---");
  const logres = await ssh.execCommand('pm2 logs HypeKing --lines 30 --nostream');
  console.log(logres.stdout);

  console.log("\n--- DB TRADES ---");
  const dbRes = await ssh.execCommand(`node -e "
    const Database = require('/root/automaton/node_modules/better-sqlite3');
    const db = new Database('/root/.automaton/state.db');
    const rows = db.prepare('SELECT pnl_usdc, pnl_pct, status, market, side, open_time, close_reason FROM trades ORDER BY rowid DESC LIMIT 15').all();
    console.log(JSON.stringify(rows, null, 2));
    db.close();
  "`);
  console.log(dbRes.stdout || dbRes.stderr);

  console.log("\n--- HL POSITIONS ---");
  const posRes = await ssh.execCommand('cd /root/automaton && node -e "import { getOpenPositions } from \'./dist/survival/hyperliquid.js\'; (async () => { const p = await getOpenPositions(); console.log(JSON.stringify(p, null, 2)); process.exit(0); })();" --input-type=module');
  console.log(posRes.stdout || posRes.stderr);

  ssh.dispose();
}

run().catch(console.error);
