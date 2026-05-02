/**
 * HyperScalperX Minimal Database
 * 
 * SQLite-backed persistent state for the trading bot.
 * Focuses only on Trades, Identity, and Activity.
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { CREATE_TABLES, SCHEMA_VERSION } from "./schema.js";
import type { TradeEntry, AutomatonDatabase } from "../types.js";

export function createDatabase(dbPath: string): AutomatonDatabase {
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  const db = new Database(dbPath);

  // Optimizations
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Initialize minimal schema
  db.exec(CREATE_TABLES);

  // Migration: Add tpsl_placed if missing
  try {
    db.prepare("SELECT soft_sl FROM trades LIMIT 1").get();
  } catch (e) {
    console.log("[DB] Migrating: Adding soft_sl/nuclear_sl columns to trades table...");
    db.prepare("ALTER TABLE trades ADD COLUMN soft_sl REAL").run();
    db.prepare("ALTER TABLE trades ADD COLUMN nuclear_sl REAL").run();
  }
  
  // Migration: Add pyramided if missing
  try {
    db.prepare("SELECT pyramided FROM trades LIMIT 1").get();
  } catch (e) {
    console.log("[DB] Migrating: Adding pyramided column to trades table...");
    db.prepare("ALTER TABLE trades ADD COLUMN pyramided INTEGER DEFAULT 0").run();
  }

  // Migration: Add peak_pnl if missing
  try {
    db.prepare("SELECT peak_pnl FROM trades LIMIT 1").get();
  } catch (e) {
    console.log("[DB] Migrating: Adding peak_pnl column to trades table...");
    db.prepare("ALTER TABLE trades ADD COLUMN peak_pnl REAL DEFAULT 0").run();
  }

  return {
    // ─── Identity ──────────────────
    getIdentity: (key: string): string | undefined => {
      const row = db.prepare("SELECT value FROM identity WHERE key = ?").get(key) as { value: string } | undefined;
      return row?.value;
    },
    setIdentity: (key: string, value: string): void => {
      db.prepare("INSERT OR REPLACE INTO identity (key, value) VALUES (?, ?)").run(key, value);
    },

    // ─── Key-Value Store ───────────
    getKV: (key: string): string | undefined => {
      const row = db.prepare("SELECT value FROM kv WHERE key = ?").get(key) as { value: string } | undefined;
      return row?.value;
    },
    setKV: (key: string, value: string): void => {
      db.prepare("INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(key, value);
    },
    deleteKV: (key: string): void => {
      db.prepare("DELETE FROM kv WHERE key = ?").run(key);
    },

    // ─── Trades (HYPE_KING) ────────
    insertTrade: (trade: any): void => {
      const { id, market, side, leverage, entry_price, margin_usdc, status, dynamic_tp, dynamic_sl, open_time, confidence, tpsl_placed, tpsl_retries, soft_sl, nuclear_sl, pyramided } = trade;
      db.prepare(`
        INSERT INTO trades (id, market, side, leverage, entry_price, margin_usdc, status, dynamic_tp, dynamic_sl, open_time, confidence, tpsl_placed, tpsl_retries, soft_sl, nuclear_sl, pyramided)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, market, side, leverage, entry_price, margin_usdc, status, dynamic_tp, dynamic_sl, open_time, confidence, tpsl_placed ? 1 : 0, tpsl_retries || 0, soft_sl, nuclear_sl, pyramided ? 1 : 0);
    },
    updateTrade: (trade: any): void => {
      const { id, ...updates } = trade;
      const keys = Object.keys(updates);
      const setClause = keys.map(k => `${k} = ?`).join(", ");
      const values = keys.map(k => {
        const val = (updates as any)[k];
        return typeof val === "boolean" ? (val ? 1 : 0) : val;
      });
      db.prepare(`UPDATE trades SET ${setClause} WHERE id = ?`).run(...values, id);
    },
    getTrades: (limit: number = 50): TradeEntry[] => {
      return db.prepare("SELECT * FROM trades ORDER BY created_at DESC LIMIT ?").all(limit) as TradeEntry[];
    },
    getOpenTrades: (): TradeEntry[] => {
      return db.prepare("SELECT * FROM trades WHERE status = 'open'").all() as TradeEntry[];
    },
    getTradeStats: () => {
      const rows = db.prepare("SELECT pnl_usdc, pnl_pct FROM trades WHERE status = 'closed'").all() as any[];
      const totalTrades = rows.length;
      const wins = rows.filter(r => r.pnl_usdc > 0).length;
      const totalPnlUsdc = rows.reduce((sum, r) => sum + r.pnl_usdc, 0);
      const totalPnlPct = rows.reduce((sum, r) => sum + r.pnl_pct, 0);
      return {
        totalTrades,
        winrate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
        totalPnlUsdc,
        totalPnlPct
      };
    },

    // ─── Activities ───────────────
    insertActivity: (activity: any): void => {
      const { id, type, messageEn, messageId, timestamp, metadata } = activity;
      db.prepare(`
        INSERT INTO activities (id, type, message_en, message_id, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, type, messageEn, messageId, timestamp, metadata);
    },
    getRecentActivities: (limit: number = 50): any[] => {
      return db.prepare("SELECT * FROM activities ORDER BY timestamp DESC LIMIT ?").all(limit) as any[];
    },

    // ─── Utility ──────────────────
    getAgentState: () => "running",
    close: () => db.close()
  };
}
