import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function restoreAndStart() {
  try {
    console.log("🔗 Connecting to VPS...");
    await ssh.connect({
      host: '82.25.62.152',
      username: 'root',
      password: '@Avenged7XX'
    });

    // Buat kembali folder yang dihapus
    await ssh.execCommand('mkdir -p /root/.automaton');

    // Buat config minimal agar bot mau jalan
    const automatonConfig = {
      exchangeType: "binance",
      binanceApiKey: "aj0RserTmOl5qKETxg6A9hdx8nrVYoQL7HJJluqB6VOkEgZIdrKw5S4XDGzA2xJL",
      binanceApiSecret: "7wtdXn80ajSyG6J9JQ07gbYj6NMJMPaL3uRF0fQdtHlHLM2GoKIShcaeHECpyuu4",
      dbPath: "/root/.automaton/state.db",
      firebaseDbUrl: "https://mytradingbot-e4f0d-default-rtdb.firebaseio.com",
      firebaseServiceAccount: "/root/firebase-key.json"
    };

    console.log("📝 Restoring config to /root/.automaton/automaton.json...");
    await ssh.execCommand(`echo '${JSON.stringify(automatonConfig)}' > /root/.automaton/automaton.json`);

    console.log("🔥 Restarting Bot...");
    await ssh.execCommand('pm2 restart HypeKing');

    console.log("✅ Bot is back online and stats are clean!");
    ssh.dispose();
  } catch (err) {
    console.error("❌ Restore Failed:", err);
  }
}

restoreAndStart();
