import ccxt from "ccxt";
import { classifyMarket, trendHunter, rangeSniper, volatilityBreaker } from "./strategies.js";

async function runDynamicScanner(startingBalance: number = 20) {
    const binance = new ccxt.binance({ options: { defaultType: 'future' } });
    const assets = ["BTC", "ETH", "SOL", "LINK", "FET"];
    const timeframe = "1m";
    const days = 30;
    const totalMinutes = days * 24 * 60;

    console.log(`\n🚀 [AGEN1] 30-DAY MARATHON BACKTEST - USER A`);
    console.log(`💰 Initial Capital: $${startingBalance} | Mode: AGGRESSIVE | Compounding: ACTIVE`);
    
    // 1. Fetch 30 days of 1m data (Multi-batch)
    const allData: any = {};
    for (const asset of assets) {
        console.log(`📥 Downloading 30 days of 1m data for ${asset}...`);
        let assetCandles: any[] = [];
        let since = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        while (assetCandles.length < totalMinutes) {
            try {
                const batch = await binance.fetchOHLCV(`${asset}/USDT:USDT`, timeframe, since, 1000);
                if (!batch || batch.length === 0) break;
                assetCandles = assetCandles.concat(batch);
                since = batch[batch.length - 1][0] + 60000;
                // Progress log every 10k candles
                if (assetCandles.length % 10000 < 1000) process.stdout.write(`.`);
            } catch (e) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        allData[asset] = assetCandles;
        console.log(` Done (${assetCandles.length} candles).`);
    }

    let balance = startingBalance;
    let openTrade: any = null;
    let history: any[] = [];

    const maxSteps = Math.min(...Object.values(allData).map((d: any) => d.length));
    console.log(`\n⏳ Simulating ${maxSteps} minutes of trading...\n`);

    for (let t = 200; t < maxSteps; t++) {
        if (t % 5000 === 0) console.log(`⏳ Progress: ${((t/maxSteps)*100).toFixed(1)}% | Balance: $${balance.toFixed(2)}`);
        // ... (rest of the logic stays the same but with balance compounding)
        
        // If we have an open trade, check if it hits TP/SL/Trailing
        if (openTrade) {
            const currentCandle = allData[openTrade.asset][t];
            const high = currentCandle[2];
            const low = currentCandle[3];
            const close = currentCandle[4];

            const pnlPct = openTrade.side === "LONG" ? 
                ((close - openTrade.entry) / openTrade.entry) * 100 :
                ((openTrade.entry - close) / openTrade.entry) * 100;

            if (pnlPct > openTrade.peak) openTrade.peak = pnlPct;

            // Check SL (Tight for Aggressive)
            const slHit = openTrade.side === "LONG" ? (low <= openTrade.slPrice) : (high >= openTrade.slPrice);
            
            if (slHit) {
                const loss = (balance * 0.2) * 50 * (openTrade.slPct / 100); // 20% margin, 50x lev
                balance -= Math.abs(loss);
                history.push({ ...openTrade, result: "LOSS", pnl: -loss });
                console.log(`🔴 [${new Date(currentCandle[0]).toLocaleTimeString()}] SL Hit: ${openTrade.asset} | PnL: -$${Math.abs(loss).toFixed(2)} | Bal: $${balance.toFixed(2)}`);
                openTrade = null;
            } 
            else if (openTrade.peak >= openTrade.tpPct && pnlPct <= openTrade.peak - 0.2) {
                // Trailing exit
                const profit = (balance * 0.2) * 50 * (pnlPct / 100);
                balance += profit;
                history.push({ ...openTrade, result: "WIN (Trail)", pnl: profit });
                console.log(`🟢 [${new Date(currentCandle[0]).toLocaleTimeString()}] TP Trailed: ${openTrade.asset} | PnL: +$${profit.toFixed(2)} | Bal: $${balance.toFixed(2)}`);
                openTrade = null;
            }

            if (balance <= 5) {
                console.log("💀 ACCOUNT REKT - Simulation Stopped.");
                break;
            }
            continue;
        }

        // 3. SCANNING: Look for the best signal across all assets
        let bestSignal: any = null;

        for (const asset of Object.keys(allData)) {
            const candles = allData[asset].slice(t - 100, t);
            const marketType = classifyMarket(candles.map(c => ({t:c[0], o:c[1], h:c[2], l:c[3], c:c[4], v:c[5]})));
            
            let signal: any = { direction: "NEUTRAL" };
            if (marketType === "TRENDING_UP" || marketType === "TRENDING_DOWN") signal = trendHunter(allData[asset].slice(t-100, t), marketType);
            else if (marketType === "SIDEWAYS") signal = rangeSniper(allData[asset].slice(t-100, t), marketType);
            else if (marketType === "VOLATILE") signal = volatilityBreaker(allData[asset].slice(t-100, t), marketType);

            if (signal.direction !== "NEUTRAL") {
                if (!bestSignal || Math.abs(signal.tp) > Math.abs(bestSignal.tp)) {
                    bestSignal = { ...signal, asset, entry: allData[asset][t][4], time: allData[asset][t][0] };
                }
            }
        }

        // 4. EXECUTE best signal
        if (bestSignal) {
            const slPrice = bestSignal.direction === "LONG" ? 
                bestSignal.entry * (1 - (bestSignal.sl/100)) : 
                bestSignal.entry * (1 + (bestSignal.sl/100));

            openTrade = {
                asset: bestSignal.asset,
                side: bestSignal.direction,
                entry: bestSignal.entry,
                slPrice: slPrice,
                slPct: bestSignal.sl,
                tpPct: bestSignal.tp,
                peak: 0,
                time: bestSignal.time
            };
            console.log(`🔍 [${new Date(bestSignal.time).toLocaleTimeString()}] Open ${bestSignal.direction} on ${bestSignal.asset} @ ${bestSignal.entry} | Reason: ${bestSignal.reason}`);
        }
    }

    console.log(`\n🏆 FINAL SUMMARY - USER A`);
    console.log(`══════════════════════════════════════`);
    console.log(`💰 Final Balance: $${balance.toFixed(2)}`);
    console.log(`📈 Net Profit   : ${(((balance / startingBalance) - 1) * 100).toFixed(2)}%`);
    console.log(`🎯 Total Trades : ${history.length}`);
    console.log(`🔥 Win Rate     : ${((history.filter(h => h.pnl > 0).length / history.length) * 100 || 0).toFixed(1)}%`);
    console.log(`══════════════════════════════════════\n`);
}

runDynamicScanner(20).catch(console.error);
