import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("📡 Fetching last 500 lines of PM2 logs from VPS...");
  const logs = await ssh.execCommand('pm2 logs HypeKing --lines 500 --nostream 2>&1');
  console.log(logs.stdout || logs.stderr);

  console.log("\n\n📡 Checking recent DB trades...");
  const db = await ssh.execCommand(`cd /root/automaton && node -e "
    const Database = require('better-sqlite3');
    const db = new Database('/root/automaton/state.db');
    const rows = db.prepare('SELECT * FROM trades ORDER BY rowid DESC LIMIT 40').all();
    console.log(JSON.stringify(rows, null, 2));
    db.close();
  "`);
  console.log(db.stdout || db.stderr);

  ssh.dispose();
}

run().catch(console.error);
