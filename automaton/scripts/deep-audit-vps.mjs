import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("🔍 [1/4] Searching for state.db...");
  const findRes = await ssh.execCommand('find /root -name "state.db"');
  const dbPaths = findRes.stdout.split('\n').filter(p => p.trim());
  console.log("Found DB paths:", dbPaths);

  const mainDb = dbPaths.find(p => p.includes('.automaton')) || dbPaths[0];
  if (!mainDb) {
    console.log("❌ state.db not found!");
  } else {
    console.log(`📊 [2/4] Fetching trade history from: ${mainDb}`);
    const dbRes = await ssh.execCommand(`node -e "
      const Database = require('/root/automaton/node_modules/better-sqlite3');
      const db = new Database('${mainDb}');
      const trades = db.prepare('SELECT * FROM trades ORDER BY rowid DESC LIMIT 50').all();
      console.log('---TRADE_HISTORY_START---');
      console.log(JSON.stringify(trades, null, 2));
      console.log('---TRADE_HISTORY_END---');
      const stats = db.prepare('SELECT status, count(*) as count FROM trades GROUP BY status').all();
      console.log('Stats:', JSON.stringify(stats));
      db.close();
    "`);
    console.log(dbRes.stdout || dbRes.stderr);
  }

  console.log("\n📡 [3/4] Checking live Hyperliquid Status via Bot script...");
  // Run a quick check-agent-state or similar on VPS if available
  const hlRes = await ssh.execCommand('cd /root/automaton && node -e "import { getOpenPositions, getBalance } from \'./dist/survival/hyperliquid.js\'; (async () => { const p = await getOpenPositions(); const b = await getBalance(); console.log(\'---HL_STATUS_START---\'); console.log(JSON.stringify({ positions: p, balance: b }, null, 2)); console.log(\'---HL_STATUS_END---\'); })();" --input-type=module');
  console.log(hlRes.stdout || hlRes.stderr);

  console.log("\n📜 [4/4] Tailing last 100 log lines...");
  const logRes = await ssh.execCommand('pm2 logs HypeKing --lines 100 --nostream');
  console.log(logRes.stdout);

  ssh.dispose();
}

run().catch(console.error);
