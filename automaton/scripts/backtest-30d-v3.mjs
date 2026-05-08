import { getCandles } from '../dist/survival/hyperliquid.js';
import { analyzeChameleonWick } from '../dist/survival/technicals.js';

async function runBacktest30D() {
    console.log("👑 === ULTIMATE 30-DAY BACKTEST: CHAMELEON V3 === 👑");
    console.log("Range: 30 Days | Strategy: Sultan Mode (100% Valid)\n");

    const assets = ["SOL", "ETH", "WLD", "AAVE", "AVAX"];
    let totalBalance = 1000; 
    const startBalance = totalBalance;
    let tradeLogs = [];

    for (const asset of assets) {
        console.log(`📡 Fetching 30 days data for ${asset}...`);
        try {
            // Fetching in chunks because HL has limits per request
            // 30 days * 24h * 4 (15m candles) = 2880 candles
            const candles = await getCandles(asset, "15m", 2880);
            let openTrade = null;

            for (let i = 150; i < candles.length; i++) {
                const currentCandles = candles.slice(i - 150, i);
                const now = candles[i];

                if (openTrade) {
                    const isLong = openTrade.side === "LONG";
                    const price = now.c;
                    const pnlPct = ((price - openTrade.entry) / openTrade.entry * 100) * (isLong ? 1 : -1);
                    
                    if (pnlPct > openTrade.peakPnl) openTrade.peakPnl = pnlPct;

                    // 1. Hard SL (1.3%)
                    const slHit = isLong ? (now.l <= openTrade.slPrice) : (now.h >= openTrade.slPrice);
                    if (slHit) {
                        const lossUsdc = (-1.3 / 100) * openTrade.value;
                        totalBalance += lossUsdc;
                        tradeLogs.push({ asset, side: openTrade.side, result: "SL", pnl: -1.3, date: new Date(now.t).toLocaleDateString() });
                        openTrade = null;
                        continue;
                    }

                    // 2. Trailing TP (1.7% / 0.5%)
                    if (openTrade.peakPnl >= 1.7 && pnlPct < openTrade.peakPnl - 0.5) {
                        const winUsdc = (pnlPct / 100) * openTrade.value;
                        totalBalance += winUsdc;
                        tradeLogs.push({ asset, side: openTrade.side, result: "TP", pnl: pnlPct, date: new Date(now.t).toLocaleDateString() });
                        openTrade = null;
                        continue;
                    }
                } else {
                    // Logic Entry
                    const sig = analyzeChameleonWick(currentCandles);
                    const last24h = currentCandles.slice(-96);
                    const h24 = Math.max(...last24h.map(c => c.h));
                    const l24 = Math.min(...last24h.map(c => c.l));
                    
                    let validEntry = false;
                    // Filter High/Low 24h + Wick Rejection
                    if (sig.direction === "SHORT" && now.c >= h24 * 0.985) validEntry = true;
                    if (sig.direction === "LONG" && now.c <= l24 * 1.015) validEntry = true;

                    if (validEntry) {
                        const margin = totalBalance * 0.40;
                        openTrade = {
                            asset,
                            side: sig.direction,
                            entry: now.c,
                            value: margin * 10,
                            slPrice: sig.direction === "LONG" ? now.c * 0.987 : now.c * 1.013,
                            peakPnl: 0,
                            time: now.t
                        };
                    }
                }
            }
        } catch (e) {
            console.log(`⚠️ Failed to fetch ${asset}: ${e.message}`);
        }
    }

    console.log("\n📊 --- 30-DAY PERFORMANCE REPORT --- 📊");
    const wins = tradeLogs.filter(t => t.pnl > 0).length;
    const losses = tradeLogs.filter(t => t.pnl < 0).length;
    const netPnl = totalBalance - startBalance;

    console.log(`💰 Initial Balance: $${startBalance.toFixed(2)}`);
    console.log(`💰 Final Balance  : $${totalBalance.toFixed(2)}`);
    console.log(`📈 Net PnL        : $${netPnl.toFixed(2)} (${(netPnl/startBalance*100).toFixed(2)}%)`);
    console.log(`🎯 Win Rate       : ${((wins/(wins+losses))*100).toFixed(1)}% (${wins}W / ${losses}L)`);
    console.log(`🚀 Total Trades   : ${tradeLogs.length}`);
    
    // Monthly breakdown (optional but cool)
    console.log("\nSample Trades (Last 5):");
    console.table(tradeLogs.slice(-5));
}

runBacktest30D();
