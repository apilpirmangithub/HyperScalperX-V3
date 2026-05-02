import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  const remoteScript = `
    import { initHyperliquid, getOpenPositions, getOpenOrders, getMidPrice, getUserFills } from '/root/automaton/dist/survival/hyperliquid.js';
    import Database from '/root/automaton/node_modules/better-sqlite3/lib/index.js';
    const db = new Database('/root/.automaton/state.db');
    
    async function audit() {
      await initHyperliquid();
      const pos = await getOpenPositions();
      const solPos = pos.find(p => p.asset === 'SOL');
      const orders = await getOpenOrders();
      const solOrders = orders.filter(o => o.coin === 'SOL');
      const mid = await getMidPrice('SOL');
      const fills = await getUserFills('0xBB5F9cDF24BdFAc0A1eBB63faa35900d9b5313c9');
      const recentSolFills = fills.filter(f => f.coin === 'SOL').slice(0, 5);
      const dbTrade = db.prepare("SELECT * FROM trades WHERE market = 'SOL' AND status = 'open'").get();
      
      console.log('---DATA_START---');
      console.log(JSON.stringify({ solPos, solOrders, currentPrice: mid, recentSolFills, dbTrade }, null, 2));
      console.log('---DATA_END---');
      db.close();
    }
    audit().catch(e => { console.error(e); process.exit(1); });
  `;
  
  await ssh.execCommand(`cat > /tmp/audit_sol_fill_check.mjs << 'EOF'
${remoteScript}
EOF`);

  const res = await ssh.execCommand('node /tmp/audit_sol_fill_check.mjs');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

run().catch(console.error);
