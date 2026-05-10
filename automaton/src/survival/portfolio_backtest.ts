/**
 * PORTFOLIO BACKTEST — TRUE 30 DAYS (MULTI-BATCH)
 */
import ccxt from "ccxt";
import { analyzeChameleonWick, setStrategyConfig } from "./technicals.js";

async function runPortfolioBacktest() {
    const binance = new ccxt.binance({ options: { defaultType: 'future' } });
    const assets = ["SOL", "ETH", "BTC", "NEAR", "AVAX", "OP", "ARB", "JTO", "TIA", "SUI", "LINK", "FET", "WLD", "AAVE", "LTC"];
    const days = 60;
    const initialBalance = 100;
    let balance = initialBalance;
    let openTrade: any = null;
    let tradeHistory: any[] = [];
    
    console.log(`🚀 RUNNING WEEKLY GROWTH TEST (60 DAYS) | STARTING: $${initialBalance}`);

    const allData: any = {};
    for (const asset of assets) {
        console.log(`📥 Fetching ${asset}...`);
        let allCandles: any[] = [];
        let since = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        while (allCandles.length < days * 96) {
            const candles = await binance.fetchOHLCV(`${asset}/USDT:USDT`, "15m", since, 1000);
            if (!candles || candles.length === 0) break;
            allCandles = allCandles.concat(candles);
            since = (candles[candles.length - 1] as any)[0] + 1;
        }
        allData[asset] = allCandles.map(c => ({ t: c[0], o: c[1], h: c[2], l: c[3], c: c[4], v: c[5] }));
    }

    const totalSteps = allData[assets[0]].length;
    console.log(`\n⏳ Menjalankan simulasi di ${totalSteps} titik waktu (90 Hari)...\n`);
    let maxWin = 0;
    let maxLoss = 0;
    let peakBalance = initialBalance;
    let maxDD = 0;

    for (let i = 100; i < totalSteps; i++) {
        if (openTrade) {
            const cur = allData[openTrade.asset][i];
            const isLong = openTrade.side === "LONG";
            
            // Current PnL based on High/Low
            const highPnl = ((cur.h - openTrade.entry) / openTrade.entry) * 100 * (isLong ? 1 : -1);
            const lowPnl = ((cur.l - openTrade.entry) / openTrade.entry) * 100 * (isLong ? 1 : -1);
            
            // CONSERVATIVE CHECK: If both hit in same candle, assume LOSS first
            if (lowPnl <= -1.0 && highPnl >= 1.2) {
                const fee = 0.08;
                const netLossPct = (-1.0 * 20) - fee;
                const profitOrLoss = initialBalance * 0.40 * (netLossPct / 100);
                balance += profitOrLoss;
                tradeHistory.push({ ...openTrade, exit: cur.t, result: "LOSS (Same Candle)", pnl: profitOrLoss, pct: -1.0 });
                openTrade = null;
                continue;
            }

            // Track Peak for Trailing
            if (highPnl > openTrade.peak) {
                openTrade.peak = highPnl;
            }

            // TRIGGER TRAILING or HARD SL
            if (openTrade.peak >= 1.2) {
                const currentExitPct = isLong ? 
                    ((cur.c - openTrade.entry) / openTrade.entry) * 100 :
                    ((openTrade.entry - cur.c) / openTrade.entry) * 100;
                
                if (currentExitPct <= (openTrade.peak - 0.5)) {
                    const finalPnlPct = Math.max(1.2, openTrade.peak - 0.5); 
                    const fee = 0.08;
                    const netPnlPct = (finalPnlPct * 20) - fee; 
                    const profitOrLoss = initialBalance * 0.40 * (netPnlPct / 100);
                    
                    balance += profitOrLoss;
                    tradeHistory.push({ ...openTrade, exit: cur.t, result: "WIN (Trail)", pnl: profitOrLoss, pct: finalPnlPct });
                    
                    if (tradeHistory.length <= 5) {
                        console.log(`✅ [TRADE #${tradeHistory.length}] ${openTrade.asset} ${openTrade.side} | Entry: ${openTrade.entry.toFixed(4)} | Peak: ${openTrade.peak.toFixed(2)}% | Exit: WIN @ ${finalPnlPct.toFixed(2)}%`);
                    }

                    openTrade = null;
                }
            } else if (lowPnl <= -1.0) {
                const fee = 0.08;
                const netLossPct = (-1.0 * 20) - fee;
                const profitOrLoss = initialBalance * 0.40 * (netLossPct / 100);
                balance += profitOrLoss;
                tradeHistory.push({ ...openTrade, exit: cur.t, result: "LOSS", pnl: profitOrLoss, pct: -1.0 });

                if (tradeHistory.length <= 5) {
                    console.log(`❌ [TRADE #${tradeHistory.length}] ${openTrade.asset} ${openTrade.side} | Entry: ${openTrade.entry.toFixed(4)} | Exit: HARD SL @ -1.00%`);
                }

                openTrade = null;
            }

            // Track Drawdown
            if (balance > peakBalance) peakBalance = balance;
            const dd = ((peakBalance - balance) / peakBalance) * 100;
            if (dd > maxDD) maxDD = dd;
            
            continue;
        }

        const candidates: any[] = [];
        for (const asset of assets) {
            setStrategyConfig({ zThreshold: 2.6, wickThreshold: 0.05, tp: 1.2, sl: 1.0 });
            const sig = analyzeChameleonWick(allData[asset].slice(i - 100, i));
            if (sig.direction !== "NEUTRAL") {
                candidates.push({ 
                    asset, 
                    side: sig.direction, 
                    entry: allData[asset][i].o, 
                    score: Math.abs(sig.zScore || 0), 
                    time: allData[asset][i].t,
                    peak: 0 
                });
            }
        }

        if (candidates.length > 0) {
            openTrade = candidates.sort((a, b) => b.score - a.score)[0];
        }
    }

    const totalWins = tradeHistory.filter(t => t.result.includes("WIN")).length;
    const winRate = (totalWins / tradeHistory.length) * 100;
    const totalPnl = balance - initialBalance;

    maxWin = Math.max(...tradeHistory.map(t => t.pnl));
    maxLoss = Math.min(...tradeHistory.map(t => t.pnl));

    console.log("\n📅 ══════════════ WEEKLY REPORT ══════════════");
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    for (let w = 0; w < 8; w++) {
        const weekStart = startTime + (w * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = weekStart + (7 * 24 * 60 * 60 * 1000);
        const weekTrades = tradeHistory.filter(t => t.exit >= weekStart && t.exit < weekEnd);
        const weekPnl = weekTrades.reduce((sum, t) => sum + t.pnl, 0);
        const weekWins = weekTrades.filter(t => t.result.includes("WIN")).length;
        console.log(` Minggu ${w+1}: PnL: $${weekPnl.toFixed(2)} | Trades: ${weekTrades.length} | Wins: ${weekWins}`);
    }
    console.log("════════════════════════════════════════════\n");

    console.log("🏆 ═══════════════════════════════════════════════");
    console.log(`   FINAL SUMMARY (60 DAYS | MODAL $${initialBalance})`);
    console.log("═══════════════════════════════════════════════");
    console.log(`💰 Initial Balance  : $${initialBalance}`);
    console.log(`📈 Final Balance    : $${balance.toFixed(2)}`);
    console.log(`💵 Total Profit     : $${totalPnl.toFixed(2)} (${((totalPnl/initialBalance)*100).toFixed(2)}%)`);
    console.log(`🎯 Total Trades     : ${tradeHistory.length}`);
    console.log(`🔥 Win Rate         : ${winRate.toFixed(1)}%`);
    console.log(`🚀 Best Trade       : $${maxWin.toFixed(2)}`);
    console.log(`💀 Worst Trade      : $${maxLoss.toFixed(2)}`);
    console.log(`📉 Max Drawdown     : ${maxDD.toFixed(2)}%`);
    console.log("═══════════════════════════════════════════════\n");
}

runPortfolioBacktest().catch(console.error);
