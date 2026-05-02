import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("📊 --- DEEP TRADE HISTORY AUDIT (Last 6 Hours) ---");
  // Query trades from the last 6 hours based on open_time
  const dbRes = await ssh.execCommand(`node -e "
    const Database = require('/root/automaton/node_modules/better-sqlite3');
    const db = new Database('/root/.automaton/state.db');
    
    // Fetch trades from roughly the last 6 hours (SQLite datetime('now', '-6 hours'))
    // Using created_at since open_time might be formatted differently
    const rows = db.prepare(\\\"SELECT id, market, side, entry_price, close_price, pnl_usdc, pnl_pct, status, open_time, close_time, close_reason FROM trades WHERE created_at > datetime('now', '-18 hours') ORDER BY rowid DESC LIMIT 100\\\" ).all();
    
    console.log('---DATA_START---');
    console.log(JSON.stringify(rows, null, 2));
    console.log('---DATA_END---');
    
    const stats = db.prepare(\\\"SELECT status, count(*) as count, sum(pnl_usdc) as total_pnl FROM trades WHERE created_at > datetime('now', '-18 hours') GROUP BY status\\\").all();
    console.log('Stats:', JSON.stringify(stats, null, 2));
    
    db.close();
  "`);

  if (dbRes.stdout) {
    console.log(dbRes.stdout);
  } else {
    console.log("Error or no output from DB query.");
    console.log(dbRes.stderr);
  }

  ssh.dispose();
}

run().catch(console.error);
