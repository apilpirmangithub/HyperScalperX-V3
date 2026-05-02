import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("📊 --- POST-FIX TRADE HISTORY AUDIT ---");
  const dbRes = await ssh.execCommand(`node -e "
    const Database = require('/root/automaton/node_modules/better-sqlite3');
    const db = new Database('/root/.automaton/state.db');
    const rows = db.prepare('SELECT market, side, entry_price, close_price, status, pnl_usdc, close_reason, open_time FROM trades WHERE open_time > \\\"2026-04-02T18:27:00\\\" ORDER BY rowid DESC').all();
    console.log(JSON.stringify(rows, null, 2));
    db.close();
  "`);

  if (dbRes.stdout) {
    console.log(dbRes.stdout);
  } else {
    console.log("No data found or Error.");
    console.log(dbRes.stderr);
  }

  ssh.dispose();
}

run().catch(console.error);
