import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  console.log("---VPS_CONFIG---");
  const res = await ssh.execCommand('grep -A 20 "HYPE_KING = {" /root/automaton/dist/survival/hype-king-loop.js');
  console.log(res.stdout);

  ssh.dispose();
}

run().catch(console.error);
