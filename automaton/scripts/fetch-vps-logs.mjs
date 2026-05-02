import { NodeSSH } from 'node-ssh';
import * as fs from 'fs';

const ssh = new NodeSSH();

async function fetchLogs() {
  try {
    await ssh.connect({
      host: 'server021294638',
      username: 'root',
      password: '@venged7XXgg32'
    });

    console.log("Connected to VPS. Fetching logs...");
    const res = await ssh.execCommand('pm2 logs HypeKing --lines 1000 --nostream');
    fs.writeFileSync('vps_logs.txt', res.stdout || res.stderr);
    console.log("Logs saved to vps_logs.txt");
    ssh.dispose();
  } catch (err) {
    console.error("Error fetching logs:", err);
  }
}

fetchLogs();
