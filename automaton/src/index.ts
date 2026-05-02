#!/usr/bin/env node
import "dotenv/config";
/**
 * HyperScalperX - Specialized Trading Automaton
 * 
 * CLEAN BUILD: No LLM, no AI agents, 100% focused on HYPE_KING strategy.
 */

import { loadWalletAccount, getMainWalletAddress } from "./identity/wallet.js";
import { loadConfig, resolvePath } from "./config.js";
import { createDatabase } from "./state/database.js";
import { startDashboardServer } from "./dashboard/server.js";
import { startHypeKingLoop, getBotStats, getOpenTradesStatus, stopBot } from "./survival/hype-king-loop.js";
import { initTelegram, startTelegramPolling } from "./survival/telegram.js";

async function main(): Promise<void> {
  console.log(`[${new Date().toISOString()}] 👑 HyperScalperX Clean Rebuild starting...`);

  // 1. Initial Load & Config
  const config = loadConfig();
  if (!config) {
    console.error("❌ ERROR: No config found at ~/.automaton/automaton.json. Please run interactive setup or upload config.");
    process.exit(1);
  }
  console.log(`[${new Date().toISOString()}] [Checkpoint] ⚙️ Config Loaded.`);

  // 2. Initialize Database (Simplified Schema)
  const dbPath = resolvePath(config.dbPath || "~/.automaton/state.db");
  const db = createDatabase(dbPath);
  console.log(`[${new Date().toISOString()}] [Checkpoint] ✅ Database Online at ${dbPath}`);

  // 3. Load Wallet
  const account = loadWalletAccount();
  const mainAddress = getMainWalletAddress();
  console.log(`[${new Date().toISOString()}] [Checkpoint] 🔑 Signer Wallet: ${account?.address || "Missing"} | Main: ${mainAddress || "Missing"}`);

  // 4. Initialize Telegram (Interactive)
  initTelegram();
  startTelegramPolling({
    getStatus: async () => await getBotStats(db),
    getOpenTrades: async () => await getOpenTradesStatus(),
    stopBot: async () => await stopBot()
  });
  console.log(`[${new Date().toISOString()}] [Checkpoint] 📡 Telegram Interactive Polling Ready.`);

  // 5. Start Dashboard Web UI (Port 3000)
  try {
    startDashboardServer({
      db,
      config,
      walletAddress: mainAddress,
      port: 3000
    });
    console.log(`[${new Date().toISOString()}] [Checkpoint] 🖥️ Dashboard active at http://0.0.0.0:3000`);
  } catch (err: any) {
    console.warn(`[${new Date().toISOString()}] ⚠️ Dashboard failed: ${err.message}`);
  }

  // 6. Start HYPE_KING Autonomous Trading Loop
  try {
    console.log(`[${new Date().toISOString()}] [Checkpoint] 🚀 Launching HYPE_KING Trading Engine...`);
    startHypeKingLoop(db).catch(err => {
      console.error(`[CRITICAL] HYPE_KING loop crashed: ${err.message}`);
    });
  } catch (err: any) {
    console.error(`[CRITICAL] Failed to start trading loop: ${err.message}`);
  }

  // 6. Graceful Shutdown
  const shutdown = () => {
    console.log(`\n[${new Date().toISOString()}] 🛑 Shutting down HyperScalperX...`);
    db.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Keep process alive
  while (true) {
    await new Promise(r => setTimeout(r, 60000));
  }
}

main().catch((err) => {
  console.error(`[FATAL] HyperScalperX Error: ${err.message}`);
  process.exit(1);
});
