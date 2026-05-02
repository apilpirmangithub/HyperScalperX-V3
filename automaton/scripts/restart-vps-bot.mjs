import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log('🔄 Restarting HypeKing on PM2...');
  // 1. Restart the bot
  // We use the new directory from deploy.mjs: /root/HyperScalperX/automaton
  const res = await ssh.execCommand('cd /root/HyperScalperX/automaton && pm2 restart HypeKing || pm2 start dist/index.js --name HypeKing');
  console.log(res.stdout || res.stderr);

  // 2. Wait 10s and check logs
  console.log('⏳ Waiting for startup logs...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  const logs = await ssh.execCommand('pm2 logs HypeKing --lines 20 --nostream');
  console.log('---LOG_SNAPSHOT---');
  console.log(logs.stdout || logs.stderr);

  ssh.dispose();
}

run().catch(console.error);
