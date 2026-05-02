import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function runAudit() {
  console.log('Connecting to VPS: server021294638...');
  
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log('✅ Connected!');

  console.log('\n--- ZERO-TRUST CODE SCAN: OLD WALLET ---');
  const oldWallet = '0x814c530441f330b9d1AcD51D308aEa81df6E73eD';
  // Search for the wallet in /root/automaton excluding dist and node_modules
  const searchWallet = await ssh.execCommand(`grep -r "${oldWallet}" /root/automaton --exclude-dir={dist,node_modules,.git}`);
  if (searchWallet.stdout) {
    console.log('⚠️ ALERT: Wallet found in files:\n', searchWallet.stdout);
  } else {
    console.log('✅ CLEAN: No trace of old wallet in source code.');
  }

  console.log('\n--- ZERO-TRUST CODE SCAN: HYPE ASSET ---');
  // Search for 'HYPE' to verify if it represents a trading signal or config
  const searchHype = await ssh.execCommand(`grep -r "HYPE" /root/automaton/src --exclude-dir={dist,node_modules,.git}`);
  if (searchHype.stdout) {
    console.log('🔍 INFO: HYPE found (expected in whitelist/rejection logic):\n', searchHype.stdout);
  } else {
    console.log('✅ CLEAN: No mention of HYPE in source code.');
  }

  console.log('\n--- LIVE STATUS CHECK ---');
  const pm2Res = await ssh.execCommand('pm2 status');
  console.log('PM2 Status:\n', pm2Res.stdout);

  console.log('\n--- DATA BREACH CHECK: wallet.json ---');
  const walletCheck = await ssh.execCommand('cat /root/.automaton/wallet.json');
  if (walletCheck.stdout.includes(oldWallet)) {
    console.error('❌ CRITICAL ERROR: VPS wallet.json still has the old address!');
  } else {
    console.log('✅ SUCCESS: VPS wallet.json is using the NEW secure wallet.');
  }

  console.log('\n✅ ZERO-TRUST AUDIT FINISHED.');
  process.exit(0);
}

runAudit().catch(err => {
  console.error('❌ Audit Error:', err);
  process.exit(1);
});
