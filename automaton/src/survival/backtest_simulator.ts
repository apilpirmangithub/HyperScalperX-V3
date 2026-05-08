/**
 * HYPERSCALPER X - PREMIUM BACKTEST SIMULATOR
 * Simulates Chameleon Sniper V3 on Historical Binance Data
 */

import ccxt from "ccxt";
import { analyzeChameleonWick, Candle } from "./technicals.js";

export async function runBacktest(asset: string = "SOL", days: number = 30) {
    console.log(`\n🚀 STARTING BACKTEST: ${asset}/USDT (${days} Days Data)`);
    console.log(`═════════════════════════════════════════════════════════`);

    const binance = new ccxt.binance();
    const symbol = `${asset}/USDT:USDT`;
    
    // 1. Fetch historical data (15m candles)
    // 30 days * 24h * 4 (15m candles per hour) = 2880 candles
    const limit = days * 24 * 4;
    console.log(`📡 Fetching ${limit} candles (15m) from Binance...`);
    const ohlcv = await binance.fetchOHLCV(symbol, "15m", undefined, limit);



    
    const candles: Candle[] = ohlcv.map(c => ({
        t: c[0] as number,
        o: c[1] as number,
        h: c[2] as number,
        l: c[3] as number,
        c: c[4] as number,
        v: c[5] as number,
        n: 0
    }));

    const initialBalance = 1000;
    let balance = initialBalance; 

    let wins = 0;
    let losses = 0;
    let totalTrades = 0;
    const trades: any[] = [];

    // 2. Loop through historical data
    // We need at least 100 candles of history for indicators to be stable
    for (let i = 100; i < candles.length; i++) {
        const history = candles.slice(0, i + 1);
        const signal = analyzeChameleonWick(history);

        if (signal.direction !== "NEUTRAL") {
            const entryPrice = candles[i].c;
            const direction = signal.direction;
            
            // Look ahead to see if TP or SL is hit first
            let result: "WIN" | "LOSS" | "TIMEOUT" = "TIMEOUT";
            let exitPrice = 0;
            let pnl = 0;

            // Target %
            const targetTP = signal.tp / 100; // 2.5%
            const targetSL = signal.sl / 100; // 1.0%

            // Search next candles for outcome (max 24h search)
            for (let j = i + 1; j < Math.min(i + 96, candles.length); j++) {
                const high = candles[j].h;
                const low = candles[j].l;

                if (direction === "LONG") {
                    if (high >= entryPrice * (1 + targetTP)) {
                        result = "WIN";
                        exitPrice = entryPrice * (1 + targetTP);
                        break;
                    }
                    if (low <= entryPrice * (1 - targetSL)) {
                        result = "LOSS";
                        exitPrice = entryPrice * (1 - targetSL);
                        break;
                    }
                } else { // SHORT
                    if (low <= entryPrice * (1 - targetTP)) {
                        result = "WIN";
                        exitPrice = entryPrice * (1 - targetTP);
                        break;
                    }
                    if (high >= entryPrice * (1 + targetSL)) {
                        result = "LOSS";
                        exitPrice = entryPrice * (1 + targetSL);
                        break;
                    }
                }
            }

            if (result !== "TIMEOUT") {
                totalTrades++;
                const isWin = result === "WIN";
                if (isWin) wins++; else losses++;
                
                // Assuming 20x Leverage as per common setup
                const leverage = 20;
                const margin = balance * 0.1; // Risk 10% of balance per trade
                const tradePnl = isWin ? (margin * leverage * targetTP) : -(margin * leverage * targetSL);
                
                balance += tradePnl;
                
                trades.push({
                    time: new Date(candles[i].t).toLocaleString(),
                    asset,
                    side: direction,
                    entry: entryPrice,
                    exit: exitPrice,
                    result: result,
                    pnl: tradePnl.toFixed(2)
                });

                // Skip ahead to the end of this trade to avoid overlapping signals
                i += 4; 
            }
        }
    }

    // 3. Output Results
    console.log(`\n📊 BACKTEST RESULTS:`);
    console.log(`─────────────────────────────────────────────────────────`);
    console.log(`💰 Initial Balance: $1000`);
    console.log(`📈 Final Balance  : $${balance.toFixed(2)}`);
    console.log(`💵 Total Profit   : $${(balance - 1000).toFixed(2)} (${((balance - 1000) / 10).toFixed(2)}%)`);
    console.log(`🎯 Total Trades   : ${totalTrades}`);
    const finalProfit = ((balance / initialBalance) - 1) * 100;
    
    console.log(`🔥 Win Rate       : ${((wins / totalTrades) * 100 || 0).toFixed(1)}%`);
    console.log(`─────────────────────────────────────────────────────────\n`);

    if (trades.length > 0) {
        console.log(`📜 Recent Trade Details:`);
        trades.slice(-5).forEach(t => {
            const pnlNum = typeof t.pnl === 'number' ? t.pnl : parseFloat(t.pnl);
            console.log(`[${t.time}] ${t.side} ${t.asset} | ${t.result} | PnL: $${pnlNum.toFixed(2)}`);
        });
    }

    return {
        balance,
        profit: finalProfit,
        totalTrades: trades.length,
        wins: trades.filter(t => t.pnl > 0).length,
        losses: trades.filter(t => t.pnl < 0).length
    };
}



// Only run if called directly from CLI
const isDirectRun = process.argv[1]?.endsWith('backtest_simulator.ts') || process.argv[1]?.endsWith('backtest_simulator.js');

if (isDirectRun) {
    const assetToTest = process.argv[2] || "SOL";
    const daysToTest = parseInt(process.argv[3]) || 30;
    runBacktest(assetToTest, daysToTest).catch(console.error);
}
