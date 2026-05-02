import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("🛑 Stopping HypeKing on VPS...");
  const res = await ssh.execCommand('pm2 stop HypeKing');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

run().catch(console.error);
