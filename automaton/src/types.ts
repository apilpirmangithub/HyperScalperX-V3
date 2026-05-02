/**
 * HyperScalperX - Simplified Types
 * 
 * Minimal interfaces for the specialized trading bot.
 */

import type { PrivateKeyAccount, Address } from "viem";

// ─── Identity ────────────────────────────────────────────────────

export interface AutomatonIdentity {
  name: string;
  address: Address;
  account: PrivateKeyAccount;
  creatorAddress: Address;
  sandboxId: string;
  apiKey: string;
  createdAt: string;
}

export interface WalletData {
  privateKey: `0x${string}`;
  createdAt: string;
}

// ─── Configuration ───────────────────────────────────────────────

export interface AutomatonConfig {
  name: string;
  creatorAddress: Address;
  sandboxId: string;
  conwayApiUrl: string;
  conwayApiKey: string;
  dbPath: string;
  logLevel: "debug" | "info" | "warn" | "error";
  walletAddress: Address;
  version: string;
  telegramBotToken?: string;
  telegramChatId?: string;
}

export const DEFAULT_CONFIG: Partial<AutomatonConfig> = {
  dbPath: "~/.automaton/state.db",
  logLevel: "info",
  version: "1.0.0-clean",
};

// ─── Perpetual Trading ───────────────────────────────────────────

export interface TradeEntry {
  id: string;
  market: string;
  side: "LONG" | "SHORT";
  leverage: number;
  entry_price: number;
  close_price?: number;
  margin_usdc: number;
  pnl_pct?: number;
  pnl_usdc?: number;
  status: "pending" | "open" | "closed";
  dynamic_tp: number;
  dynamic_sl: number;
  open_time: string;
  close_time?: string;
  close_reason?: string;
  confidence?: number;
  trail_peak?: number;
  tpsl_placed?: boolean;
  tpsl_retries?: number;
  soft_sl?: number;
  nuclear_sl?: number;
  pyramided?: boolean;
}

export interface TradeStats {
  totalTrades: number;
  winrate: number;
  totalPnlUsdc: number;
  totalPnlPct: number;
}

// ─── Bot Activity ───────────────────────────────────────────────

export interface BotActivity {
  id: string;
  type: string;
  messageEn: string;
  messageId: string;
  timestamp: string;
  metadata?: string;
}

// ─── Database Interface ──────────────────────────────────────────

export interface AutomatonDatabase {
  getIdentity(key: string): string | undefined;
  setIdentity(key: string, value: string): void;
  getKV(key: string): string | undefined;
  setKV(key: string, value: string): void;
  deleteKV(key: string): void;
  insertTrade(trade: TradeEntry): void;
  updateTrade(trade: Partial<TradeEntry> & { id: string }): void;
  getTrades(limit?: number): TradeEntry[];
  getTradeStats(): TradeStats;
  getOpenTrades(): TradeEntry[];
  insertActivity(activity: BotActivity): void;
  getRecentActivities(limit?: number): BotActivity[];
  getAgentState(): string;
  close(): void;
}
