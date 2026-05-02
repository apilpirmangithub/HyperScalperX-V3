/**
 * HyperScalperX Wallet Identity
 * 
 * Manages the EVM wallet for trading.
 * No Conway API dependency for clean, fast startup.
 */

import type { PrivateKeyAccount } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In clean version, we use a predictable directory relative to HOME
const AUTOMATON_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || "/root",
  ".automaton",
);
const WALLET_FILE = path.join(AUTOMATON_DIR, "wallet.json");

let cachedAccount: PrivateKeyAccount | null = null;

export function getAutomatonDir(): string {
  return AUTOMATON_DIR;
}

export function getWalletPath(): string {
  return WALLET_FILE;
}

export async function getWallet(): Promise<{
  account: PrivateKeyAccount;
  isNew: boolean;
}> {
  if (cachedAccount) return { account: cachedAccount, isNew: false };
  
  if (!fs.existsSync(AUTOMATON_DIR)) {
    fs.mkdirSync(AUTOMATON_DIR, { recursive: true, mode: 0o700 });
  }

  // 1. Local File Priority
  if (fs.existsSync(WALLET_FILE)) {
    const data = JSON.parse(fs.readFileSync(WALLET_FILE, "utf-8"));
    const account = privateKeyToAccount(data.privateKey);
    cachedAccount = account;
    return { account, isNew: false };
  }

  // 2. Generate New (if missing)
  console.log("Generating new wallet for HyperScalperX...");
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  fs.writeFileSync(WALLET_FILE, JSON.stringify({
    privateKey,
    createdAt: new Date().toISOString(),
  }, null, 2), { mode: 0o600 });

  cachedAccount = account;
  return { account, isNew: true };
}

export function loadWalletAccount(): PrivateKeyAccount | null {
  if (cachedAccount) return cachedAccount;

  // 1. Check Environment Variable (for .env or cloud)
  const envPk = process.env.PRIVATE_KEY || process.env.WALLETPRIVATEKEY;
  if (envPk) {
    cachedAccount = privateKeyToAccount(envPk as `0x${string}`);
    return cachedAccount;
  }

  // 2. Fallback to wallet.json
  if (!fs.existsSync(WALLET_FILE)) {
      const privateKey = generatePrivateKey();
      const account = privateKeyToAccount(privateKey);
      fs.writeFileSync(WALLET_FILE, JSON.stringify({
          mainWallet: "0x814c530441f330b9d1AcD51D308aEa81df6E73eD",
          address: account.address,
          privateKey: privateKey,
          generatedAt: new Date().toISOString()
      }, null, 2));
      console.log(`[Wallet] 🔑 Generated new Hyperliquid Signer: ${account.address} for Main Wallet: 0x814...`);
  }
  
  const data = JSON.parse(fs.readFileSync(WALLET_FILE, "utf-8"));
  cachedAccount = privateKeyToAccount(data.privateKey as `0x${string}`);
  return cachedAccount;
}

export function getMainWalletAddress(): string {
  if (fs.existsSync(WALLET_FILE)) {
    const data = JSON.parse(fs.readFileSync(WALLET_FILE, "utf-8"));
    if (data.mainWallet) return data.mainWallet;
  }
  const account = loadWalletAccount();
  return account ? account.address : "";
}

export function getWalletPrivateKey(): string | null {
  // 1. Check Environment Variable
  const envPk = process.env.PRIVATE_KEY || process.env.WALLETPRIVATEKEY;
  if (envPk) return envPk;

  // 2. Fallback to wallet.json
  if (fs.existsSync(WALLET_FILE)) {
    const data = JSON.parse(fs.readFileSync(WALLET_FILE, "utf-8"));
    return data.privateKey;
  }
  return null;
}

export function getSigningAddress(): string | null {
  const account = loadWalletAccount();
  return account ? account.address : null;
}
