import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyzeChameleonWick, type Candle } from "../src/survival/technicals.js";
import * as fs from "fs";

const DAY_MS = 24 * 60 * 60 * 1000;
const END_TIME = Date.now();
const START_TIME = END_TIME - (30 * DAY_MS);

// CURRENT LIVE PARAMETERS
const CONFIG = {
    marginPortion: 0.40,
    leverage: 20,
    buffer: 0.95,
    trailStart: 1.2,
    trailCallback: 0.5
};

async function fetchCandlesChunked(info: InfoClient, coin: string, startTime: number, endTime: number): Promise<Candle[]> {
    let currentStart = startTime;
    const intervalMs = 15 * 24 * 60 * 60 * 1000; 
    let allCandles: Candle[] = [];
    while (currentStart < endTime) {
        const chunkEnd = Math.min(currentStart + intervalMs, endTime);
        try {
            const raw = await info.candleSnapshot({ coin, interval: "15m", startTime: currentStart, endTime: chunkEnd }) as any[];
            if (raw && raw.length > 0) {
                allCandles = allCandles.concat(raw.map(c => ({
                    t: c.t, o: parseFloat(c.o), h: parseFloat(c.h), l: parseFloat(c.l),
                    c: parseFloat(c.c), v: parseFloat(c.v), n: c.n
                })));
            }
            await new Promise(r => setTimeout(r, 100)); 
        } catch (e) { }
        currentStart = chunkEnd;
    }
    const unique = new Map();
    allCandles.forEach(c => unique.set(c.t, c));
    return Array.from(unique.values()).sort((a,b) => a.t - b.t);
}

async function runBacktest() {
    console.log("🚀 HYPERSCALPERX - REALISTIC BINANCE BACKTEST (30 DAYS) 🚀");
    console.log(`Period: Last 30 Days (${new Date(START_TIME).toLocaleDateString()} - ${new Date(END_TIME).toLocaleDateString()})`);
    
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    
    // Core assets excluding those not on HL or different names
    const assets = ["SOL", "ETH", "BTC", "NEAR", "AVAX", "OP", "ARB", "JTO", "TIA", "SUI", "LINK", "FET", "WLD", "AAVE", "LTC"];
    
    console.log(`📡 Fetching market data...`);
    const assetData: Record<string, Candle[]> = {};
    for (const asset of assets) {
        const fetchStart = START_TIME - (3 * DAY_MS); // 3 days history for indicators
        assetData[asset] = await fetchCandlesChunked(info, asset, fetchStart, END_TIME);
    }

    const allTs = new Set<number>();
    Object.values(assetData).forEach(candles => candles.forEach(c => {
        if (c.t >= START_TIME && c.t < END_TIME) allTs.add(c.t);
    }));
    const sortedTs = Array.from(allTs).sort((a,b) => a - b);

    let balance = 20.0; // Start with real $20
    const initialBalance = balance;
    let peakBalance = balance;
    let maxDrawdown = 0;
    
    let activePos: any = null;
    const tradeHistory: any[] = [];
    
    for (const t of sortedTs) {
        if (activePos) {
            const candles = assetData[activePos.asset];
            const c = candles.find(cand => cand.t === t);
            if (c) {
                const isLong = activePos.dir === "LONG";
                const pnlPct = ((c.c - activePos.entry) / activePos.entry * 100) * (isLong ? 1 : -1);
                
                // Trailing logic
                if (pnlPct > activePos.peak) activePos.peak = pnlPct;

                let exit = "";
                let exitPrice = c.c;
                const slPrice = isLong ? activePos.entry * (1 - activePos.sl/100) : activePos.entry * (1 + activePos.sl/100);
                
                if (isLong ? c.l <= slPrice : c.h >= slPrice) {
                    exit = "SL";
                    exitPrice = slPrice;
                } else if (activePos.peak >= CONFIG.trailStart && pnlPct <= activePos.peak - CONFIG.trailCallback) {
                    exit = "TP";
                    // Realistic Trailing: Exit exactly at Peak - Callback %
                    const exitPct = activePos.peak - CONFIG.trailCallback;
                    exitPrice = isLong ? activePos.entry * (1 + exitPct/100) : activePos.entry * (1 - exitPct/100);
                }

                if (exit) {
                    const actualPnlPct = ((exitPrice - activePos.entry) / activePos.entry * 100) * (isLong ? 1 : -1);
                    const grossPnl = activePos.size * (Math.abs(exitPrice - activePos.entry)) * (actualPnlPct > 0 ? 1 : -1);
                    
                    // Binance Fees: 0.04% taker per trade (entry and exit)
                    const notionalEntry = activePos.size * activePos.entry;
                    const notionalExit = activePos.size * exitPrice;
                    const fee = (notionalEntry + notionalExit) * 0.0004;

                    const netPnl = grossPnl - fee;
                    balance += netPnl;

                    if (balance > peakBalance) peakBalance = balance;
                    const dd = (peakBalance - balance) / peakBalance * 100;
                    if (dd > maxDrawdown) maxDrawdown = dd;
                    
                    tradeHistory.push({ 
                        asset: activePos.asset, 
                        dir: activePos.dir, 
                        pnlPct: actualPnlPct, 
                        netPnlUsd: netPnl,
                        reason: exit, 
                        time: new Date(t).toISOString() 
                    });
                    
                    activePos = null;
                }
            }
        }

        if (!activePos && balance >= 5) {
            let candidates = [];
            for (const asset of assets) {
                const candles = assetData[asset];
                const idx = candles.findIndex(cand => cand.t === t);
                if (idx < 150) continue;
                
                const sig = analyzeChameleonWick(candles.slice(0, idx + 1));
                if (sig.direction !== "NEUTRAL") {
                    candidates.push({ asset, direction: sig.direction, score: Math.abs(sig.zScore || 0) * (sig.volSurge || 1), sl: sig.sl, entryPrice: candles[idx].c });
                }
            }
            if (candidates.length > 0) {
                const best = candidates.sort((a,b) => b.score - a.score)[0];
                let margin = (balance - 0.5) * CONFIG.marginPortion;
                if (balance < margin * 1.05) margin = balance * 0.90;
                
                const sizeAsset = (margin * CONFIG.buffer * CONFIG.leverage) / best.entryPrice;
                activePos = { 
                    asset: best.asset, 
                    dir: best.direction, 
                    entry: best.entryPrice, 
                    size: sizeAsset,
                    margin: margin, 
                    peak: 0,
                    sl: best.sl
                };
            }
        }
    }

    const netProfit = balance - initialBalance;
    const roi = (netProfit / initialBalance) * 100;
    const winRate = tradeHistory.length > 0 ? (tradeHistory.filter(h => h.netPnlUsd > 0).length / tradeHistory.length * 100) : 0;

    const report = `
# 🚀 REALISTIC BINANCE BACKTEST (LAST 30 DAYS)
### Strategy: Chameleon V3 + 40% Margin + 20x Lev + Binance Fees

- **Initial Balance**: $${initialBalance.toFixed(2)}
- **Final Balance**: $${balance.toFixed(2)}
- **Net Profit**: $${netProfit.toFixed(2)}
- **ROI**: **${roi.toFixed(2)}%**
- **Win Rate**: ${winRate.toFixed(1)}%
- **Max Drawdown**: ${maxDrawdown.toFixed(2)}%
- **Total Trades**: ${tradeHistory.length}

### 📈 Trade Log (Last 15):
${tradeHistory.slice(-15).map(h => `- **${h.asset}** ${h.dir}: ${h.pnlPct > 0 ? '🟢' : '🔴'} ${h.pnlPct.toFixed(2)}% ($${h.netPnlUsd.toFixed(2)}) via ${h.reason}`).join("\n")}
`;

    console.log(report);
    fs.writeFileSync("backtest_binance_real_30days.md", report);
}

runBacktest().catch(console.error);
