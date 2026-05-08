import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function fetchLogs() {
  try {
    console.log("Connecting to VPS 82.25.62.152...");
    await ssh.connect({
      host: '82.25.62.152',
      username: 'root',
      password: '@Avenged7XX',
      readyTimeout: 30000
    });

    console.log("Connected. Fetching HypeKing logs...");
    const res = await ssh.execCommand('pm2 logs HypeKing --lines 100 --nostream');
    
    console.log("\n--- START OF LOGS ---");
    console.log(res.stdout || res.stderr || "No logs found.");
    console.log("--- END OF LOGS ---\n");

    ssh.dispose();
  } catch (err) {
    console.error("Error fetching logs:", err);
  }
}

fetchLogs();
