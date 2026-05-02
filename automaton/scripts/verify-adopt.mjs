import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  // Check DB open trades after restart
  await ssh.execCommand(`cat > /tmp/verify_adopt.js << 'SCRIPT'
const Database = require("/root/automaton/node_modules/better-sqlite3");
const db = new Database("/root/.automaton/state.db");
const open = db.prepare("SELECT id, market, side, leverage, entry_price, status, confidence, tpsl_placed, soft_sl FROM trades WHERE status = 'open'").all();
console.log("OPEN_TRADES:" + JSON.stringify(open, null, 2));
db.close();
SCRIPT`);
  const dbRes = await ssh.execCommand('node /tmp/verify_adopt.js');
  console.log(dbRes.stdout || dbRes.stderr);

  // Check startup logs
  const logRes = await ssh.execCommand('pm2 logs HypeKing --lines 40 --nostream');
  console.log("\nLOGS:");
  console.log(logRes.stdout);

  ssh.dispose();

  fs.writeFileSync('adopt_verify.txt', (dbRes.stdout || dbRes.stderr) + '\n\nLOGS:\n' + logRes.stdout, 'utf8');
}

run().catch(console.error);
