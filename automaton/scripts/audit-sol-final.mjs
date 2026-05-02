import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  const remoteScript = `
    import { initHyperliquid, getOpenOrders, getMidPrice } from '/root/automaton/dist/survival/hyperliquid.js';
    const Database = (await import('/root/automaton/node_modules/better-sqlite3/lib/index.js')).default;
    const db = new Database('/root/.automaton/state.db');
    
    async function audit() {
      const solTrade = db.prepare("SELECT * FROM trades WHERE market = 'SOL' AND status = 'open'").get();
      await initHyperliquid();
      const orders = await getOpenOrders();
      const solOrders = orders.filter(o => o.coin === 'SOL');
      const mid = await getMidPrice('SOL');
      
      console.log('---DATA_START---');
      console.log(JSON.stringify({ solTrade, solOrders, currentPrice: mid }, null, 2));
      console.log('---DATA_END---');
      db.close();
    }
    audit().catch(console.error);
  `;
  
  await ssh.execCommand(`cat > /tmp/audit_sol_simple.mjs << 'EOF'
${remoteScript}
EOF`);

  const res = await ssh.execCommand('node --input-type=module /tmp/audit_sol_simple.mjs');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

run().catch(console.error);
