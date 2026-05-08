import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function deepResetVps() {
  try {
    console.log("🔗 Connecting to VPS for DEEP RESET...");
    await ssh.connect({
      host: '82.25.62.152',
      username: 'root',
      password: '@Avenged7XX'
    });

    console.log("🧹 Destroying hidden database at ~/.automaton/state.db...");
    await ssh.execCommand('rm -rf /root/.automaton');
    
    console.log("🔥 Restarting Bot...");
    await ssh.execCommand('pm2 restart HypeKing');

    console.log("✅ DEEP RESET SUCCESSFUL! All ghosts are gone.");
    ssh.dispose();
  } catch (err) {
    console.error("❌ Deep Reset Failed:", err);
  }
}

deepResetVps();
