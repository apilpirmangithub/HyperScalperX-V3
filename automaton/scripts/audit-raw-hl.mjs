import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: 'server021294638',
      username: 'root',
      password: '@venged7XXgg32'
    });

    const body = JSON.stringify({
      type: 'clearinghouseState',
      user: '0xBB5F9cDF24BdFAc0A1eBB63faa35900d9b5313c9'
    });

    // Use raw curl on VPS via SSH
    const res = await ssh.execCommand(`curl -s -X POST https://api.hyperliquid.xyz/info -H "Content-Type: application/json" -d '${body}'`);
    
    if (res.stdout) {
      const data = JSON.parse(res.stdout);
      const positions = data.assetPositions.filter(p => parseFloat(p.position.s) !== 0);
      console.log('---RAW_POSITIONS---');
      console.log(JSON.stringify({
        total_balance: data.crossMarginSummary?.accountValue || 0,
        positions: positions.map(p => ({
          asset: p.position.coin,
          size: p.position.s,
          entry: p.position.entryPx,
          pnl: p.position.unrealizedPnl
        }))
      }, null, 2));
    } else {
      console.error('No output from curl:', res.stderr);
    }

    ssh.dispose();
  } catch (err) {
    console.error('SSH/Audit Error:', err);
  }
}

run();
