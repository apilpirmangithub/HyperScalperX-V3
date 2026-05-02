import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  const res = await ssh.execCommand('pm2 jlist');
  const procs = JSON.parse(res.stdout);
  const hypeKing = procs.find(p => p.name === 'HypeKing');
  
  if (hypeKing) {
    console.log(JSON.stringify({
      status: hypeKing.pm2_env.status,
      uptime: Math.round((Date.now() - hypeKing.pm2_env.pm_uptime) / 60000) + 'm',
      restarts: hypeKing.pm2_env.restart_time,
      cpu: hypeKing.monit.cpu,
      memory: Math.round(hypeKing.monit.memory / 1024 / 1024) + 'MB'
    }, null, 2));
  } else {
    console.log('HypeKing not found');
  }

  ssh.dispose();
}

run().catch(console.error);
