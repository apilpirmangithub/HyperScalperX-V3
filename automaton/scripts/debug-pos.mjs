import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  const remoteScript = `
    import { initHyperliquid, getOpenPositions, getBalance } from '/root/HyperScalperX/automaton/dist/survival/hyperliquid.js';
    import { loadWalletAccount } from '/root/HyperScalperX/automaton/dist/identity/wallet.js';
    
    async function debug() {
      await initHyperliquid();
      const account = loadWalletAccount();
      const pos = await getOpenPositions();
      const bal = await getBalance();
      
      console.log('---DEBUG_START---');
      console.log(JSON.stringify({ 
        loadedAddress: account?.address,
        posCount: pos.length,
        positions: pos,
        balance: bal
      }, null, 2));
      console.log('---DEBUG_END---');
    }
    debug().catch(console.error);
  `;
  
  await ssh.execCommand(`cat > /tmp/debug_pos_discrepancy.mjs << 'EOF'
${remoteScript}
EOF`);

  const res = await ssh.execCommand('node /tmp/debug_pos_discrepancy.mjs');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

run().catch(console.error);
