import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  const remoteScript = `
    import { initHyperliquid, getMidPrice } from '/root/automaton/dist/survival/hyperliquid.js';
    
    async function audit() {
      await initHyperliquid();
      const mid = await getMidPrice('SOL');
      console.log('---DATA_START---');
      console.log(JSON.stringify({ currentPrice: mid }, null, 2));
      console.log('---DATA_END---');
    }
    audit().catch(e => { console.error(e); process.exit(1); });
  `;
  
  await ssh.execCommand(`cat > /tmp/audit_sol_price.mjs << 'EOF'
${remoteScript}
EOF`);

  const res = await ssh.execCommand('node /tmp/audit_sol_price.mjs');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

run().catch(console.error);
