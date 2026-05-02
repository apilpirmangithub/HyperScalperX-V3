/**
 * HyperScalperX - Clean Dashboard Data Collector
 * 
 * Extracts only essential trading statistics and logs for the Web UI.
 */

import type { AutomatonDatabase } from "../types.js";
import { getBalance } from "../survival/hyperliquid.js";

export async function collectDashboardData(opts: { db: AutomatonDatabase, walletAddress: string }) {
  const { db, walletAddress } = opts;
  
  // Get live stats from DB
  const stats = db.getTradeStats();
  const recentTrades = db.getTrades(20);
  const recentActivities = db.getRecentActivities(20);
  
  // Try to get live account value from Hyperliquid, fallback to 0 if failed
  let hlAccountValue = 0;
  let perpValue = 0;
  let spotBalance = 0;
  try {
      const bal = await getBalance();
      hlAccountValue = bal.totalValue;
      perpValue = bal.accountValue;
      spotBalance = bal.spotValue;
  } catch (err) {
      console.log(`[Dashboard] Could not fetch live balance: ${err}`);
  }

  return {
    walletAddress,
    hlAccountValue,
    perpValue,
    spotBalance,
    totalPnlUsdc: stats.totalPnlUsdc,
    winRate: stats.winrate,
    recentTrades,
    recentActivities
  };
}
