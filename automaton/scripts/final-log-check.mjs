import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  const res = await ssh.execCommand('pm2 logs HypeKing --lines 300 --nostream');
  console.log('---LOGS_START---');
  console.log(res.stdout || res.stderr);
  console.log('---LOGS_END---');

  ssh.dispose();
}

run().catch(console.error);
