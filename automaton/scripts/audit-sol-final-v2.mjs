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
    import Database from '/root/automaton/node_modules/better-sqlite3/lib/index.js';
    const db = new Database('/root/.automaton/state.db');
    
    async function audit() {
      const solTrade = db.prepare("SELECT * FROM trades WHERE market = 'SOL' AND status = 'open'").get();
      await initHyperliquid();
      const orders = await getOpenOrders();
      const solOrders = orders.filter(o => o.coin === 'SOL');
      const mid = await getMidPrice('SOL');
      
      process.stdout.write('---DATA_START---\\n');
      process.stdout.write(JSON.stringify({ solTrade, solOrders, currentPrice: mid }, null, 2) + '\\n');
      process.stdout.write('---DATA_END---\\n');
      db.close();
    }
    audit().catch(e => { console.error(e); process.exit(1); });
  `;
  
  await ssh.execCommand(`cat > /tmp/audit_sol_final.mjs << 'EOF'
${remoteScript}
EOF`);

  const res = await ssh.execCommand('node /tmp/audit_sol_final.mjs');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

run().catch(console.error);
