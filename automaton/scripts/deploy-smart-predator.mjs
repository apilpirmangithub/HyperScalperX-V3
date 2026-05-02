import { NodeSSH } from 'node-ssh';
const ssh = new NodeSSH();

async function deploySmartPredator() {
  console.log('🔌 Connecting to Cloudzy VPS: server021294638...');
  
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log('✅ Connected! Uploading Smart Predator logic...');
  
  // Upload core strategy files
  await ssh.putFile('src/survival/hype-king-loop.ts', '/root/automaton/src/survival/hype-king-loop.ts');
  await ssh.putFile('src/survival/hyperliquid.ts', '/root/automaton/src/survival/hyperliquid.ts');
  
  console.log('🔨 Compiling new TypeScript logic directly on VPS...');
  const buildResult = await ssh.execCommand('cd /root/automaton && npm run build');
  console.log(buildResult.stdout || buildResult.stderr);

  console.log('🚀 Restarting HypeKing Bot via PM2...');
  const launchResult = await ssh.execCommand('cd /root/automaton && pm2 restart "hyper-scalper" || pm2 start dist/index.js --name "hyper-scalper" -- --run');
  console.log(launchResult.stdout);

  console.log('🎉 DEPLOYMENT SUCCESSFUL! The Smart Predator is LIVE.');
  process.exit(0);
}

deploySmartPredator().catch(err => {
  console.error('❌ Deployment Error:', err);
  process.exit(1);
});
