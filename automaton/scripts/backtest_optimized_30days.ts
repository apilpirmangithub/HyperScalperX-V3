import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyzeChameleonWick, type Candle, zScore, volumeSurge } from "../src/survival/technicals.js";
import * as fs from "fs";

const DAY_MS = 24 * 60 * 60 * 1000;
const END_TIME = Date.now();
const START_TIME = END_TIME - (30 * DAY_MS);

// OPTIMIZED PARAMETERS
const CONFIG = {
    zThresh: 3.2,
    volThresh: 1.8,
    marginPortion: 0.50,
    trailStart: 1.5,
    trailCallback: 0.5,
    sl: 1.3
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
        } catch (e) {
            console.error(`Error fetching ${coin}: ${e}`);
        }
        currentStart = chunkEnd;
    }
    const unique = new Map();
    allCandles.forEach(c => unique.set(c.t, c));
    return Array.from(unique.values()).sort((a,b) => a.t - b.t);
}

function analyzeOptimized(candles: Candle[]): any {
    if (candles.length < 100) return { direction: "NEUTRAL" };
    const current = candles[candles.length - 1];
    const closes = candles.map(c => c.c);
    const z = zScore(closes, 20);
    const vol = volumeSurge(candles, 20);
    const window24h = candles.slice(-96); 
    const low24h = Math.min(...window24h.map(c => c.l));
    const high24h = Math.max(...window24h.map(c => c.h));
    
    const totalLength = current.h - current.l;
    const bodyTop = Math.max(current.o, current.c);
    const bodyBottom = Math.min(current.o, current.c);
    const upperWick = current.h - bodyTop;
    const lowerWick = bodyBottom - current.l;
    const upperWickRatio = totalLength > 0 ? upperWick / totalLength : 0;
    const lowerWickRatio = totalLength > 0 ? lowerWick / totalLength : 0;

    if (z < -CONFIG.zThresh && vol >= CONFIG.volThresh && upperWickRatio < 0.15 && current.c < low24h * 1.02) {
        return { direction: "LONG" };
    }
    if (z > CONFIG.zThresh && vol >= CONFIG.volThresh && lowerWickRatio < 0.15 && current.c > high24h * 0.98) {
        return { direction: "SHORT" };
    }
    return { direction: "NEUTRAL" };
}

async function runBacktest() {
    console.log("🚀 HYPERSCALPERX - OPTIMIZED BACKTEST (30 DAYS) 🚀");
    console.log(`Period: Last 30 Days (${new Date(START_TIME).toLocaleDateString()} - ${new Date(END_TIME).toLocaleDateString()})`);
    console.log(`Params: Z-Thresh: ${CONFIG.zThresh}, Vol: ${CONFIG.volThresh}, Margin: ${CONFIG.marginPortion*100}%`);
    console.log("------------------------------------------");

    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    
    const assets = ["SOL", "SEI", "WLD", "AAVE", "AVAX", "NEAR", "OP", "ARB", "FET", "HYPE", "BTC", "ETH", "XRP"];
    
    console.log(`📡 Fetching data...`);
    const assetData: Record<string, Candle[]> = {};
    for (const asset of assets) {
        const fetchStart = START_TIME - (10 * DAY_MS); 
        assetData[asset] = await fetchCandlesChunked(info, asset, fetchStart, END_TIME);
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
    
    let activePos: any = null;
    const tradeHistory: any[] = [];
    
    for (const t of sortedTs) {
        if (activePos) {
            const candles = assetData[activePos.asset];
            const c = candles.find(cand => cand.t === t);
            if (c) {
                const isLong = activePos.dir === "LONG";
                const pnlPct = ((c.c - activePos.entry) / activePos.entry * 100) * (isLong ? 1 : -1);
                if (pnlPct > activePos.peak) activePos.peak = pnlPct;

                let exit = "";
                const slPrice = isLong ? activePos.entry * (1 - CONFIG.sl/100) : activePos.entry * (1 + CONFIG.sl/100);
                if (isLong ? c.l <= slPrice : c.h >= slPrice) {
                    exit = "SL";
                } else if (activePos.peak >= CONFIG.trailStart && pnlPct < activePos.peak - CONFIG.trailCallback) {
                    exit = "TP";
                }

                if (exit) {
                    const factor = (exit === "SL" ? -CONFIG.sl/100 : (activePos.peak - CONFIG.trailCallback)/100);
                    balance += activePos.margin * 10 * factor;
                    if (balance > peakBalance) peakBalance = balance;
                    const dd = (peakBalance - balance) / peakBalance * 100;
                    if (dd > maxDrawdown) maxDrawdown = dd;
                    tradeHistory.push({ asset: activePos.asset, dir: activePos.dir, pnlPct: factor * 100 * 10, reason: exit, time: new Date(t).toISOString() });
                    activePos = null;
                }
            }
        }

        if (!activePos) {
            for (const asset of assets) {
                const candles = assetData[asset];
                const idx = candles.findIndex(cand => cand.t === t);
                if (idx < 100) continue;
                const sig = analyzeOptimized(candles.slice(0, idx + 1));
                if (sig.direction !== "NEUTRAL") {
                    activePos = { asset, dir: sig.direction, entry: candles[idx].c, margin: balance * CONFIG.marginPortion, peak: 0 };
                    break;
                }
            }
        }
    }

    const netProfit = balance - initialBalance;
    const roi = (netProfit / initialBalance) * 100;
    const winRate = tradeHistory.length > 0 ? (tradeHistory.filter(h => h.pnlPct > 0).length / tradeHistory.length * 100) : 0;

    const report = `
# 🚀 RESULT: OPTIMIZED SULTAN BACKTEST (30 DAYS)
### Performa dengan Parameter Baru (Z-3.2, Margin 50%)

- **Initial Balance**: $1,000.00
- **Final Balance**: $${balance.toFixed(2)}
- **ROI**: **${roi.toFixed(2)}%**
- **Win Rate**: ${winRate.toFixed(1)}%
- **Max Drawdown**: ${maxDrawdown.toFixed(2)}%
- **Total Trades**: ${tradeHistory.length}

### 📈 Trade Log (Last 10):
${tradeHistory.slice(-10).map(h => `- **${h.asset}** ${h.dir}: ${h.pnlPct.toFixed(2)}% via ${h.reason}`).join("\n")}
`;

    console.log(report);
    fs.writeFileSync("backtest_optimized_30days.md", report);
}

runBacktest().catch(console.error);
