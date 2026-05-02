import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("--- FINAL PM2 LOG CHECK ---");
  const res = await ssh.execCommand('pm2 logs HypeKing --lines 100 --nostream');
  console.log(res.stdout);

  ssh.dispose();
}

run().catch(console.error);
