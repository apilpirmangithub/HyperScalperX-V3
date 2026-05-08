import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyzeChameleonWick, type Candle } from "../src/survival/technicals.js";
import * as fs from "fs";

const DAY_MS = 24 * 60 * 60 * 1000;
const END_TIME = Date.now();
const START_TIME = END_TIME - (7 * DAY_MS);

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
        } catch (e) {
            console.error(`Error fetching ${coin}: ${e}`);
        }
        currentStart = chunkEnd;
    }
    const unique = new Map();
    allCandles.forEach(c => unique.set(c.t, c));
    return Array.from(unique.values()).sort((a,b) => a.t - b.t);
}

async function runBacktest() {
    console.log("🚀 HYPERSCALPERX - REAL BACKTEST (SULTAN MODE) 🚀");
    console.log(`Period: Last 7 Days (${new Date(START_TIME).toLocaleDateString()} - ${new Date(END_TIME).toLocaleDateString()})`);
    console.log("Strategy: Chameleon Sniper V3 (Locked Logic)");
    console.log("------------------------------------------");

    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    
    const assets = ["SOL", "SEI", "WLD", "AAVE", "AVAX", "NEAR", "OP", "ARB", "FET", "PEPE", "HYPE", "BTC", "ETH", "XRP"];
    
    console.log(`📡 Fetching historical data for ${assets.length} assets...`);
    
    const assetData: Record<string, Candle[]> = {};
    for (const asset of assets) {
        // Z-Score needs history
        const fetchStart = START_TIME - (10 * DAY_MS); 
        assetData[asset] = await fetchCandlesChunked(info, asset, fetchStart, END_TIME);
        console.log(`✅ Loaded ${assetData[asset].length} candles for ${asset}`);
    }

    const allTs = new Set<number>();
    Object.values(assetData).forEach(candles => candles.forEach(c => {
        if (c.t >= START_TIME && c.t < END_TIME) allTs.add(c.t);
    }));
    const sortedTs = Array.from(allTs).sort((a,b) => a - b);

    let balance = 1000.0; 
    const initialBalance = balance;
    let peakBalance = balance;
    let maxDrawdown = 0;
    
    let activePosition: any = null;
    const tradeHistory: any[] = [];
    
    const LEVERAGE = 10;
    const MARGIN_PCT = 0.40;
    const STOP_LOSS_PCT = 1.3;
    const TRAILING_START = 1.7;
    const TRAILING_CALLBACK = 0.5;

    for (const t of sortedTs) {
        if (activePosition) {
            const candles = assetData[activePosition.asset];
            const c = candles.find(cand => cand.t === t);
            if (c) {
                const isLong = activePosition.dir === "LONG";
                const high = c.h;
                const low = c.l;
                const close = c.c;
                const currentPnlPct = ((close - activePosition.entry) / activePosition.entry * 100) * (isLong ? 1 : -1);
                if (currentPnlPct > activePosition.peakPnl) activePosition.peakPnl = currentPnlPct;

                let exitReason = "";
                let exitPrice = 0;

                const slPrice = isLong ? activePosition.entry * (1 - STOP_LOSS_PCT/100) : activePosition.entry * (1 + STOP_LOSS_PCT/100);
                if (isLong ? low <= slPrice : high >= slPrice) {
                    exitReason = "STOP_LOSS";
                    exitPrice = slPrice;
                } else if (activePosition.peakPnl >= TRAILING_START) {
                    const trailingTrigger = activePosition.peakPnl - TRAILING_CALLBACK;
                    if (currentPnlPct < trailingTrigger) {
                        exitReason = "TRAILING_TP";
                        exitPrice = close;
                    }
                }

                if (exitReason) {
                    const pnlFactor = ((exitPrice - activePosition.entry) / activePosition.entry) * (isLong ? 1 : -1);
                    const pnlUsdc = activePosition.margin * LEVERAGE * pnlFactor;
                    balance += pnlUsdc;
                    if (balance > peakBalance) peakBalance = balance;
                    const dd = (peakBalance - balance) / peakBalance * 100;
                    if (dd > maxDrawdown) maxDrawdown = dd;

                    tradeHistory.push({
                        asset: activePosition.asset,
                        dir: activePosition.dir,
                        pnlUsdc,
                        pnlPct: pnlFactor * 100 * LEVERAGE,
                        reason: exitReason,
                        time: new Date(t).toISOString()
                    });
                    activePosition = null;
                }
            }
        }

        if (!activePosition) {
            const candidates: any[] = [];
            for (const asset of assets) {
                const candles = assetData[asset];
                const idx = candles.findIndex(cand => cand.t === t);
                if (idx < 100) continue;
                const sig = analyzeChameleonWick(candles.slice(0, idx + 1));
                if (sig.direction !== "NEUTRAL") {
                    candidates.push({ asset, direction: sig.direction, price: candles[idx].c, score: Math.abs(sig.zScore || 0) * (sig.volSurge || 1) });
                }
            }
            if (candidates.length > 0) {
                const best = candidates.sort((a,b) => b.score - a.score)[0];
                const margin = balance * MARGIN_PCT;
                activePosition = { asset: best.asset, dir: best.direction, entry: best.price, margin, peakPnl: 0, startTime: t };
            }
        }
    }

    const netProfit = balance - initialBalance;
    const roi = (netProfit / initialBalance) * 100;
    const winTrades = tradeHistory.filter(h => h.pnlUsdc > 0);
    const winRate = tradeHistory.length > 0 ? (winTrades.length / tradeHistory.length) * 100 : 0;

    const report = `
# 👑 HYPERSCALPERX BACKTEST REPORT (LAST 7 DAYS) 👑
## Period: ${new Date(START_TIME).toLocaleDateString()} - ${new Date(END_TIME).toLocaleDateString()}

### 📊 Performance Summary
- **Initial Balance**: $${initialBalance.toFixed(2)}
- **Final Balance**: $${balance.toFixed(2)}
- **Net Profit**: $${netProfit.toFixed(2)} (${roi.toFixed(2)}% ROI)
- **Max Drawdown**: ${maxDrawdown.toFixed(2)}%
- **Total Trades**: ${tradeHistory.length}
- **Win Rate**: ${winRate.toFixed(1)}%

### 📈 Trade Details
${tradeHistory.map(h => `- **${h.asset}** ${h.dir}: ${h.pnlPct.toFixed(2)}% PnL ($${h.pnlUsdc.toFixed(2)}) via ${h.reason}`).join("\n")}
`;

    console.log(report);
    fs.writeFileSync("backtest_7days_report.md", report);
}

runBacktest().catch(console.error);
