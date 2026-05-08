import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function resetVpsDb() {
  try {
    console.log("🔗 Connecting to VPS to reset stats...");
    await ssh.connect({
      host: '82.25.62.152',
      username: 'root',
      password: '@Avenged7XX'
    });

    console.log("🧹 Deleting local database.json on VPS...");
    await ssh.execCommand('rm /root/automaton/database.json');
    
    console.log("🔥 Restarting Bot...");
    await ssh.execCommand('pm2 restart HypeKing');

    console.log("✅ VPS Stats have been reset to zero!");
    ssh.dispose();
  } catch (err) {
    console.error("❌ Reset Failed:", err);
  }
}

resetVpsDb();
