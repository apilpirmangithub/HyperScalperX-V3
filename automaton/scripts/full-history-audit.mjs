import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("📊 --- FULL RECENT HISTORY AUDIT ---");
  // Safely find and list the columns then fetch data
  const dbRes = await ssh.execCommand(`node -e "
    const Database = require('/root/automaton/node_modules/better-sqlite3');
    const db = new Database('/root/.automaton/state.db');
    
    // Get columns
    const columns = db.prepare('PRAGMA table_info(trades)').all().map(c => c.name);
    console.log('Columns:', columns.join(', '));
    
    // Fetch last 50 trades
    const rows = db.prepare('SELECT * FROM trades ORDER BY rowid DESC LIMIT 50').all();
    console.log('---TRADES_JSON_START---');
    console.log(JSON.stringify(rows, null, 2));
    console.log('---TRADES_JSON_END---');
    
    db.close();
  "`);

  if (dbRes.stdout) {
    console.log(dbRes.stdout);
  } else {
    console.log("No stdout from VPS.");
    console.log(dbRes.stderr);
  }

  console.log("\n📡 --- LIVE HL FILLS (Last 10) ---");
  const fillRes = await ssh.execCommand('cd /root/automaton && node -e "import { getUserFills, loadWalletAccount } from \'./dist/survival/hyperliquid.js\'; import { loadWalletAccount as lw } from \'./dist/identity/wallet.js\'; (async () => { const acc = lw(); const f = await getUserFills(acc.address); console.log(JSON.stringify(f.slice(0, 10), null, 2)); })();" --input-type=module');
  console.log(fillRes.stdout || fillRes.stderr);

  ssh.dispose();
}

run().catch(console.error);
