import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  await ssh.execCommand(`cat > /tmp/fix_db_leverage.js << 'SCRIPT'
const Database = require("/root/automaton/node_modules/better-sqlite3");
const db = new Database("/root/.automaton/state.db");
const result = db.prepare("UPDATE trades SET leverage = 10 WHERE market = 'SOL' AND status = 'open'").run();
console.log("Updated rows:", result.changes);
const verify = db.prepare("SELECT id, market, leverage, status FROM trades WHERE status = 'open'").all();
console.log(JSON.stringify(verify, null, 2));
db.close();
SCRIPT`);
  const res = await ssh.execCommand('node /tmp/fix_db_leverage.js');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

run().catch(console.error);
