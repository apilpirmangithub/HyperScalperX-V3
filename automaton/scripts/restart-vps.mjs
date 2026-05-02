import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("🔄 Restarting HypeKing with patched Circuit Breaker...");
  const restart = await ssh.execCommand('cd /root/automaton && pm2 restart HypeKing 2>&1');
  console.log(restart.stdout || restart.stderr);

  console.log("\n⏳ Waiting 10s for bot to initialize...");
  await new Promise(r => setTimeout(r, 10000));

  console.log("\n📋 PM2 Status:");
  const status = await ssh.execCommand('pm2 status 2>&1');
  console.log(status.stdout || status.stderr);

  console.log("\n📋 Latest 10 lines:");
  const logs = await ssh.execCommand('pm2 logs HypeKing --lines 10 --nostream 2>&1');
  console.log(logs.stdout || logs.stderr);

  ssh.dispose();
}

run().catch(console.error);
