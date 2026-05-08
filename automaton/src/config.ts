/**
 * HyperScalperX - Clean Configuration
 * 
 * Minimal config loading/saving for the specialized trading bot.
 */

import os from "os";
import fs from "fs";
import path from "path";
import type { AutomatonConfig } from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";
import { getAutomatonDir } from "./identity/wallet.js";

const CONFIG_FILENAME = "automaton.json";

export function getConfigPath(): string {
  return path.join(getAutomatonDir(), CONFIG_FILENAME);
}

/**
 * Load the automaton config from disk.
 */
export function loadConfig(): AutomatonConfig | null {
  const configPath = getConfigPath();
  let raw: any = {};
  
  if (fs.existsSync(configPath)) {
    try {
      raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch (e) {}
  }

  const config = {
    ...DEFAULT_CONFIG,
    ...raw,
  } as AutomatonConfig;

  // Overwrite with ENV if present (Critical for VPS/Docker)
  if (process.env.EXCHANGE_TYPE) config.exchangeType = process.env.EXCHANGE_TYPE as any;
  if (process.env.BINANCE_API_KEY) config.binanceApiKey = process.env.BINANCE_API_KEY;
  if (process.env.BINANCE_API_SECRET) config.binanceApiSecret = process.env.BINANCE_API_SECRET;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) config.firebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (process.env.FIREBASE_DB_URL) config.firebaseDbUrl = process.env.FIREBASE_DB_URL;
  if (process.env.TELEGRAM_BOT_TOKEN) config.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  if (process.env.TELEGRAM_CHAT_ID) config.telegramChatId = process.env.TELEGRAM_CHAT_ID;

  // If we have at least an exchange type, we consider it a valid config
  if (!config.exchangeType) return null;

  return config;
}

/**
 * Save the automaton config to disk.
 */
export function saveConfig(config: AutomatonConfig): void {
  const dir = getAutomatonDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

/**
 * Resolve ~ paths to absolute paths.
 */
export function resolvePath(p: string): string {
  if (p.startsWith("~")) {
    const homedir = os.homedir();
    return path.join(homedir, p.slice(1));
  }
  return p;
}
