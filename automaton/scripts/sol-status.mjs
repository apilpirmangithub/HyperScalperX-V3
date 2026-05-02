import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  const hlScript = `
    import { initHyperliquid, getOpenOrders, getMidPrice } from './dist/survival/hyperliquid.js';
    await initHyperliquid();
    const orders = await getOpenOrders();
    const solOrders = orders.filter(o => o.coin === 'SOL');
    const mid = await getMidPrice('SOL');
    console.log(JSON.stringify({ solOrders, mid }, null, 2));
  `;
  
  const hlRes = await ssh.execCommand(`cd /root/automaton && node --input-type=module -e "${hlScript}"`);
  console.log(hlRes.stdout || hlRes.stderr);

  ssh.dispose();
}

run().catch(console.error);
