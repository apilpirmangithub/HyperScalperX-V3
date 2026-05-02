import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("--- LATEST TRADES (POST-PATCH) ---");
  const dbRes = await ssh.execCommand(`node -e "
    const Database = require('/root/automaton/node_modules/better-sqlite3');
    const db = new Database('/root/.automaton/state.db');
    const rows = db.prepare('SELECT pnl_usdc, status, market, side, open_time, close_reason FROM trades ORDER BY rowid DESC LIMIT 10').all();
    console.log(JSON.stringify(rows, null, 2));
    db.close();
  "`);
  console.log(dbRes.stdout || dbRes.stderr);

  console.log("\n--- PM2 LOGS ---");
  const logRes = await ssh.execCommand('pm2 logs HypeKing --lines 20 --nostream');
  console.log(logRes.stdout);

  ssh.dispose();
}

run().catch(console.error);
