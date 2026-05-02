import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("🔍 --- SOL TRADE DEEP AUDIT ---");
  
  // 1. Check DB record
  const dbRes = await ssh.execCommand(`node -e "
    const Database = require('/root/automaton/node_modules/better-sqlite3');
    const db = new Database('/root/.automaton/state.db');
    const sol = db.prepare(\\\"SELECT * FROM trades WHERE market = 'SOL' AND status = 'open'\\\").get();
    console.log('---DB_START---');
    console.log(JSON.stringify(sol, null, 2));
    console.log('---DB_END---');
    db.close();
  "`);
  console.log(dbRes.stdout);

  // 2. Check Live Position and Orders
  const hlScript = `
    import { initHyperliquid, getOpenPositions, getOpenOrders, getMidPrice } from './dist/survival/hyperliquid.js';
    await initHyperliquid();
    const positions = await getOpenPositions();
    const solPos = positions.find(p => p.asset === 'SOL');
    const orders = await getOpenOrders();
    const solOrders = orders.filter(o => o.coin === 'SOL');
    const mid = await getMidPrice('SOL');
    
    console.log('---HL_START---');
    console.log(JSON.stringify({ solPos, solOrders, currentPrice: mid }, null, 2));
    console.log('---HL_END---');
  `;
  const hlRes = await ssh.execCommand(`cd /root/automaton && node --input-type=module -e "${hlScript}"`);
  console.log(hlRes.stdout || hlRes.stderr);

  ssh.dispose();
}

run().catch(console.error);
