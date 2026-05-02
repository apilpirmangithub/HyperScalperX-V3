/**
 * HyperScalperX Clean Schema
 * 
 * Simplified SQLite schema only for Trading, Wallet Identity, and Activity.
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
  -- Schema version tracking
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Core identity key-value store (Wallet, Sandbox info)
  CREATE TABLE IF NOT EXISTS identity (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Internal state key-value store (Offsets, Overrides)
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Perpetual trade history (HYPE_KING)
  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    market TEXT NOT NULL,
    side TEXT NOT NULL,
    leverage INTEGER NOT NULL,
    entry_price REAL NOT NULL,
    close_price REAL,
    margin_usdc REAL NOT NULL,
    pnl_pct REAL,
    pnl_usdc REAL,
    status TEXT NOT NULL DEFAULT 'open',
    dynamic_tp REAL,
    dynamic_sl REAL,
    open_time TEXT NOT NULL,
    close_time TEXT,
    close_reason TEXT,
    confidence INTEGER,
    trail_peak REAL,
    tpsl_placed INTEGER DEFAULT 0,
    tpsl_retries INTEGER DEFAULT 0,
    soft_sl REAL,
    nuclear_sl REAL,
    pyramided INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market);

  -- Bot Activity Log (Trading signals, errors)
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    message_en TEXT NOT NULL,
    message_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
`;
