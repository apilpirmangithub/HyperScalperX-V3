import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("---DB_STATE---");
  const dbRes = await ssh.execCommand(`node -e "
    const Database = require('/root/automaton/node_modules/better-sqlite3');
    const db = new Database('/root/.automaton/state.db');
    const trades = db.prepare('SELECT market, side, status, open_time, close_reason FROM trades ORDER BY rowid DESC LIMIT 50').all();
    console.log(JSON.stringify(trades, null, 2));
    db.close();
  "`);
  console.log(dbRes.stdout || dbRes.stderr);

  console.log("\n---HL_LIVE_POSITIONS---");
  const posRes = await ssh.execCommand('cd /root/automaton && node -e "import { getOpenPositions } from \'./dist/survival/hyperliquid.js\'; (async () => { const p = await getOpenPositions(); console.log(JSON.stringify(p, null, 2)); })();" --input-type=module');
  console.log(posRes.stdout || posRes.stderr);

  console.log("\n---HL_LIVE_FILLS---");
  const fillRes = await ssh.execCommand('cd /root/automaton && node -e "import { getUserFills, loadWalletAccount } from \'./dist/survival/hyperliquid.js\'; import { loadWalletAccount as lw } from \'./dist/identity/wallet.js\'; (async () => { const acc = lw(); const f = await getUserFills(acc.address); console.log(JSON.stringify(f.slice(0, 10), null, 2)); })();" --input-type=module');
  console.log(fillRes.stdout || fillRes.stderr);

  ssh.dispose();
}

run().catch(console.error);
