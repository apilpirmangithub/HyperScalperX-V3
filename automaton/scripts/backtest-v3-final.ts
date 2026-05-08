import { getCandles, getMidPrice } from '../src/survival/hyperliquid.js';
import { analyzeChameleonWick } from '../src/survival/technicals.js';

async function runBacktestV3() {
    console.log("👑 === BACKTEST SIMULATION: CHAMELEON V3 (SULTAN MODE) === 👑");
    console.log("Range: 7 Days | Assets: TOP 5 Predators | Risk: 40% Margin / 10x Value\n");

    const assets = ["SOL", "ETH", "WLD", "AAVE", "AVAX"];
    let totalBalance = 1000; // Start with $1000
    const startBalance = totalBalance;
    let openTrade: any = null;
    let tradeLogs: any[] = [];

    for (const asset of assets) {
        console.log(`📡 Fetching historical data for ${asset}...`);
        const candles = await getCandles(asset, "15m", 672); // 7 days of 15m candles
        
        for (let i = 150; i < candles.length; i++) {
            const currentCandles = candles.slice(i - 150, i);
            const now = candles[i];

            // 1. Check if we have an open trade
            if (openTrade && openTrade.asset === asset) {
                const isLong = openTrade.side === "LONG";
                const high = now.h;
                const low = now.l;
                
                // Calculate PnL %
                const price = now.c;
                const pnlPct = ((price - openTrade.entry) / openTrade.entry * 100) * (isLong ? 1 : -1);
                
                // Track Peak
                if (pnlPct > openTrade.peakPnl) openTrade.peakPnl = pnlPct;

                // Check Hard SL (1.3%)
                const currentLow = isLong ? low : high;
                const slHit = isLong ? (low <= openTrade.slPrice) : (high >= openTrade.slPrice);

                if (slHit) {
                    const loss = -1.3;
                    const lossUsdc = (loss / 100) * openTrade.value;
                    totalBalance += lossUsdc;
                    tradeLogs.push({ asset, side: openTrade.side, result: "SL", pnl: loss, pnlUsdc: lossUsdc });
                    openTrade = null;
                    continue;
                }

                // Check Trailing TP (1.7% Start, 0.5% Callback)
                if (openTrade.peakPnl >= 1.7) {
                    if (pnlPct < openTrade.peakPnl - 0.5) {
                        const win = pnlPct;
                        const winUsdc = (win / 100) * openTrade.value;
                        totalBalance += winUsdc;
                        tradeLogs.push({ asset, side: openTrade.side, result: "TP (Trailing)", pnl: win, pnlUsdc: winUsdc });
                        openTrade = null;
                        continue;
                    }
                }
            }

            // 2. Scan for Entry (Only if no open trade)
            if (!openTrade) {
                const sig = analyzeChameleonWick(currentCandles);
                
                // High/Low 24h Filter (Approx 96 candles of 15m)
                const last24h = currentCandles.slice(-96);
                const h24 = Math.max(...last24h.map(c => c.h));
                const l24 = Math.min(...last24h.map(c => c.l));
                
                let validEntry = false;
                if (sig.direction === "SHORT" && now.c >= h24 * 0.98) validEntry = true;
                if (sig.direction === "LONG" && now.c <= l24 * 1.02) validEntry = true;

                if (validEntry) {
                    const margin = totalBalance * 0.40;
                    const value = margin * 10;
                    const entryPrice = now.c;
                    const isLong = sig.direction === "LONG";
                    
                    openTrade = {
                        asset,
                        side: sig.direction,
                        entry: entryPrice,
                        margin,
                        value,
                        slPrice: isLong ? entryPrice * 0.987 : entryPrice * 1.013,
                        peakPnl: 0
                    };
                }
            }
        }
    }

    // Report
    console.log("\n📊 --- BACKTEST REPORT --- 📊");
    const wins = tradeLogs.filter(t => t.pnl > 0).length;
    const losses = tradeLogs.filter(t => t.pnl < 0).length;
    const totalPnl = totalBalance - startBalance;

    console.log(`💰 Final Balance: $${totalBalance.toFixed(2)}`);
    console.log(`📈 Net PnL     : $${totalPnl.toFixed(2)} (${(totalPnl/startBalance*100).toFixed(2)}%)`);
    console.log(`🎯 Win Rate    : ${((wins/(wins+losses))*100).toFixed(1)}% (${wins}W / ${losses}L)`);
    console.log(`🚀 Total Trades: ${tradeLogs.length}`);
}

runBacktestV3();
