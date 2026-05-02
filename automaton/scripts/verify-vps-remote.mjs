import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function verifyVPS() {
  console.log('Connecting to VPS: server021294638...');
  
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log('✅ Connected!');

  // 1. Verify Wallet Address on VPS
  console.log('\n--- VPS Wallet Verification ---');
  const catWallet = await ssh.execCommand('cat /root/.automaton/wallet.json');
  console.log('Remote Wallet Content:', catWallet.stdout);
  
  // 2. Run Standalone Test on VPS
  console.log('\n--- VPS Battle Readiness Test ---');
  // Need to install dependencies on VPS if not there, but assuming node_modules exists from previous setups.
  // We'll run the standalone script we just synced.
  const testRes = await ssh.execCommand('cd /root/automaton && node scripts/standalone-ready.mjs');
  console.log('Remote Test Output:', testRes.stdout);
  console.log('Remote Test Error:', testRes.stderr);

  // 3. Restart PM2 on VPS
  console.log('\n--- VPS Process Restart ---');
  const restartRes = await ssh.execCommand('pm2 restart hype-king || pm2 start dist/index.js --name hype-king');
  console.log('PM2 Status:', restartRes.stdout);

  console.log('\n✅ VPS VERIFICATION COMPLETE!');
  process.exit(0);
}

verifyVPS().catch(err => {
  console.error('❌ VPS Error:', err);
  process.exit(1);
});
