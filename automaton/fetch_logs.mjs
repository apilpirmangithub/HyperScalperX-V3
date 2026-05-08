import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function getLogs() {
  try {
    await ssh.connect({
      host: '82.25.62.152',
      username: 'root',
      password: '@Avenged7XX'
    });

    const result = await ssh.execCommand('pm2 logs HypeKing --lines 30 --nostream');
    console.log(result.stdout);
    console.log(result.stderr);

    ssh.dispose();
  } catch (err) {
    console.error("❌ Failed to fetch logs:", err);
  }
}

getLogs();
