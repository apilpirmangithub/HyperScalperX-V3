import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  const remoteScript = `
    import { initHyperliquid, getOpenPositions, getOpenOrders, getUserFills, getMidPrice } from '/root/automaton/dist/survival/hyperliquid.js';
    
    async function verify() {
      await initHyperliquid();
      const pos = await getOpenPositions();
      const orders = await getOpenOrders();
      const fills = await getUserFills('0xBB5F9cDF24BdFAc0A1eBB63faa35900d9b5313c9');
      const mid = await getMidPrice('SOL');
      
      console.log('---VERIFY_START---');
      console.log(JSON.stringify({ 
        solPos: pos.find(p => p.asset === 'SOL'), 
        solOrders: orders.filter(o => o.coin === 'SOL'),
        recentSolFills: fills.filter(f => f.coin === 'SOL').slice(0, 5),
        currentPrice: mid
      }, null, 2));
      console.log('---VERIFY_END---');
    }
    verify().catch(e => { console.error(e); process.exit(1); });
  `;
  
  await ssh.execCommand(`cat > /tmp/verify_sol_state.mjs << 'EOF'
${remoteScript}
EOF`);

  const res = await ssh.execCommand('node /tmp/verify_sol_state.mjs');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

run().catch(console.error);
