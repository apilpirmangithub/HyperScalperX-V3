import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  const remoteScript = `
    import axios from 'axios';
    
    async function check() {
      try {
        const res = await axios.post('https://api.hyperliquid.xyz/info', {
          type: 'clearinghouseState',
          user: '0xBB5F9cDF24BdFAc0A1eBB63faa35900d9b5313c9'
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        const positions = res.data.assetPositions.filter(p => parseFloat(p.position.s) !== 0);
        console.log('---RAW_POSITIONS_START---');
        console.log(JSON.stringify(positions, null, 2));
        console.log('---RAW_POSITIONS_END---');
      } catch (e) {
        console.error('API Error:', e.message);
      }
    }
    check();
  `;
  
  await ssh.execCommand(`cat > /tmp/raw_api_check.mjs << 'EOF'
${remoteScript}
EOF`);

  const res = await ssh.execCommand('cd /root/HyperScalperX/automaton && node --input-type=module /tmp/raw_api_check.mjs');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

run().catch(console.error);
