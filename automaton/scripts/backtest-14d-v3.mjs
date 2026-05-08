import { getCandles } from '../dist/survival/hyperliquid.js';
import { analyzeChameleonWick } from '../dist/survival/technicals.js';

async function runBacktest14D() {
    console.log("👑 === 14-DAY PERFORMANCE TEST: CHAMELEON V3 === 👑");
    console.log("Range: 14 Days | Strategy: Sultan Mode (100% Valid)\n");

    const assets = ["SOL", "ETH", "WLD", "AAVE", "AVAX"];
    let totalBalance = 1000; 
    const startBalance = totalBalance;
    let tradeLogs = [];

    for (const asset of assets) {
        console.log(`📡 Fetching 14 days data for ${asset}...`);
        try {
            const candles = await getCandles(asset, "15m", 1344); // 14 days
            let openTrade = null;

            for (let i = 150; i < candles.length; i++) {
                const currentCandles = candles.slice(i - 150, i);
                const now = candles[i];

                if (openTrade) {
                    const isLong = openTrade.side === "LONG";
                    const price = now.c;
                    const pnlPct = ((price - openTrade.entry) / openTrade.entry * 100) * (isLong ? 1 : -1);
                    
                    if (pnlPct > openTrade.peakPnl) openTrade.peakPnl = pnlPct;

                    const slHit = isLong ? (now.l <= openTrade.slPrice) : (now.h >= openTrade.slPrice);
                    if (slHit) {
                        totalBalance += (-1.3 / 100) * openTrade.value;
                        tradeLogs.push({ asset, side: openTrade.side, result: "SL", pnl: -1.3 });
                        openTrade = null;
                        continue;
                    }

                    if (openTrade.peakPnl >= 1.7 && pnlPct < openTrade.peakPnl - 0.5) {
                        totalBalance += (pnlPct / 100) * openTrade.value;
                        tradeLogs.push({ asset, side: openTrade.side, result: "TP", pnl: pnlPct });
                        openTrade = null;
                        continue;
                    }
                } else {
                    const sig = analyzeChameleonWick(currentCandles);
                    const last24h = currentCandles.slice(-96);
                    const h24 = Math.max(...last24h.map(c => c.h));
                    const l24 = Math.min(...last24h.map(c => c.l));
                    
                    let validEntry = false;
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
                            peakPnl: 0
                        };
                    }
                }
            }
        } catch (e) {}
    }

    const wins = tradeLogs.filter(t => t.pnl > 0).length;
    const losses = tradeLogs.filter(t => t.pnl < 0).length;
    console.log(`\n📊 --- 14-DAY REPORT --- 📊`);
    console.log(`💰 Final Balance: $${totalBalance.toFixed(2)}`);
    console.log(`📈 Net PnL     : $${(totalBalance - startBalance).toFixed(2)} (${((totalBalance - startBalance)/startBalance*100).toFixed(2)}%)`);
    console.log(`🎯 Win Rate    : ${((wins/(wins+losses))*100).toFixed(1)}% (${wins}W / ${losses}L)`);
}

runBacktest14D();
