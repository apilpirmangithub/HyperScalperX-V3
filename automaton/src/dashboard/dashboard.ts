/**
 * HyperScalperX - Clean Dashboard Data Collector
 */

import type { AutomatonDatabase } from "../types.js";
import { Exchange } from "../survival/exchange.js";

export async function collectDashboardData(opts: { db: AutomatonDatabase, walletAddress: string, exchange?: Exchange }) {
  const { db, walletAddress, exchange } = opts;
  
  // Get live stats from DB
  const stats = db.getTradeStats();
  const recentTrades = db.getTrades(20);
  const recentActivities = db.getRecentActivities(20);
  
  let accountValue = 0;
  let unrealizedPnl = 0;
  let marginUsed = 0;

  if (exchange) {
    try {
        const bal = await exchange.getBalance();
        accountValue = bal.totalValue;
        unrealizedPnl = bal.unrealizedPnl;
        marginUsed = bal.marginUsed;
    } catch (err) {
        console.log(`[Dashboard] Could not fetch live balance from ${exchange.name}: ${err}`);
    }
  }

  return {
    walletAddress,
    exchangeName: exchange?.name || "Unknown",
    accountValue,
    unrealizedPnl,
    marginUsed,
    totalPnlUsdc: stats.totalPnlUsdc,
    winRate: stats.winrate,
    recentTrades,
    recentActivities
  };
}
