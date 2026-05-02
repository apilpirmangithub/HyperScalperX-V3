import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  // Update DB with the close data
  await ssh.execCommand(`cat > /tmp/update_doge_db.js << 'SCRIPT'
const Database = require("/root/automaton/node_modules/better-sqlite3");
const db = new Database("/root/.automaton/state.db");
const trade = db.prepare("SELECT id FROM trades WHERE market = 'DOGE' AND status = 'open'").get();
if (trade) {
  db.prepare("UPDATE trades SET status = 'closed', close_price = 0.091111, close_time = ?, close_reason = 'atr_tp_manual', pnl_pct = 0.772, pnl_usdc = 0.8764 WHERE id = ?")
    .run(new Date().toISOString(), trade.id);
  console.log("DB_UPDATED: " + trade.id);
} else {
  console.log("No open DOGE trade found");
}
// Verify
const open = db.prepare("SELECT id, market, status FROM trades WHERE status = 'open'").all();
console.log("Remaining open:", JSON.stringify(open));
db.close();
SCRIPT`);
  const res = await ssh.execCommand('node /tmp/update_doge_db.js');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

run().catch(console.error);
