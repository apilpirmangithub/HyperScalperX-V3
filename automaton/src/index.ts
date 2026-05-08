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

  // 3. Load Wallet (Optional for Binance)
  let account = null;
  let mainAddress = "";
  if (config.exchangeType !== "binance") {
    account = loadWalletAccount();
    mainAddress = getMainWalletAddress();
    console.log(`[${new Date().toISOString()}] [Checkpoint] 🔑 Signer Wallet: ${account?.address || "Missing"} | Main: ${mainAddress || "Missing"}`);
  } else {
    console.log(`[${new Date().toISOString()}] [Checkpoint] 🔑 Binance Mode: Skipping EVM Wallet.`);
  }

  // 5. Initialize Exchange
  let exchange;
  if (config.exchangeType === "binance") {
    const { BinanceExchange } = await import("./survival/binance.js");
    if (!config.binanceApiKey || !config.binanceApiSecret) {
      console.error("❌ ERROR: Binance API Key/Secret missing in config.");
      process.exit(1);
    }
    exchange = new BinanceExchange(config.binanceApiKey, config.binanceApiSecret);
  } else {
    const { HyperliquidExchange } = await import("./survival/hyperliquid_exchange.js");
    exchange = new HyperliquidExchange();
  }
  await exchange.init();
  console.log(`[${new Date().toISOString()}] [Checkpoint] 🏦 Exchange Online: ${exchange.name}`);

  // 6. Initialize Telegram (Interactive)
  initTelegram();
  startTelegramPolling({
    getStatus: async () => await getBotStats(db, exchange),
    getOpenTrades: async () => await getOpenTradesStatus(exchange),
    stopBot: async () => await stopBot(exchange)
  });
  console.log(`[${new Date().toISOString()}] [Checkpoint] 📡 Telegram Interactive Polling Ready.`);

  // 7. Start Dashboard Web UI (Port 3000)
  try {
    startDashboardServer({
      db,
      config,
      walletAddress: mainAddress,
      exchange: exchange,
      port: 3000
    });
    console.log(`[${new Date().toISOString()}] [Checkpoint] 🖥️ Dashboard active at http://0.0.0.0:3000`);
  } catch (err: any) {
    console.warn(`[${new Date().toISOString()}] ⚠️ Dashboard failed: ${err.message}`);
  }

  // 9. Start Firebase Sync (Optional)
  console.log(`[${new Date().toISOString()}] [Checkpoint] 🛡️ Checking Firebase Sync... Account: ${config.firebaseServiceAccount ? "SET" : "MISSING"}, URL: ${config.firebaseDbUrl ? "SET" : "MISSING"}`);
  if (config.firebaseServiceAccount && config.firebaseDbUrl) {
    try {
      const { initFirebasePusher, startFirebaseSync } = await import("./survival/firebase-pusher.js");
      initFirebasePusher(config.firebaseServiceAccount, config.firebaseDbUrl);
      startFirebaseSync(db, exchange);
      console.log(`[${new Date().toISOString()}] [Checkpoint] 🔥 Firebase Sync Module Started.`);
    } catch (err: any) {
      console.error(`[Firebase] ❌ Failed to start sync module: ${err.message}`);
    }
  }

  // 10. Start HYPE_KING Autonomous Trading Loop
  try {
    console.log(`[${new Date().toISOString()}] [Checkpoint] 🚀 Launching HYPE_KING Trading Engine on ${exchange.name}...`);
    startHypeKingLoop(db, exchange).catch(err => {
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
