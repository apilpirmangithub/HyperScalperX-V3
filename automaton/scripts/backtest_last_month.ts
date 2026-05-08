import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyzeChameleonWick, type Candle } from "../src/survival/technicals.js";
import * as fs from "fs";

const DAY_MS = 24 * 60 * 60 * 1000;
const APRIL_START = new Date("2026-04-01T00:00:00Z").getTime();
const APRIL_END = new Date("2026-05-01T00:00:00Z").getTime();

async function fetchCandlesChunked(info: InfoClient, coin: string, startTime: number, endTime: number): Promise<Candle[]> {
    let currentStart = startTime;
    const intervalMs = 15 * 24 * 60 * 60 * 1000; // 15 days chunk
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
            await new Promise(r => setTimeout(r, 100)); // Rate limit safety
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
    console.log("Period: April 2026");
    console.log("Strategy: Chameleon Sniper V3 (Locked Logic)");
    console.log("------------------------------------------");

    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    
    // Assets from HYPE_KING config + Top Volume candidates
    const assets = ["SOL", "SEI", "WLD", "AAVE", "AVAX", "NEAR", "OP", "ARB", "FET", "PEPE", "HYPE", "BTC", "ETH", "XRP"];
    
    console.log(`📡 Fetching historical data for ${assets.length} assets...`);
    
    const assetData: Record<string, Candle[]> = {};
    for (const asset of assets) {
        // We need some buffer before April to calculate technicals (Z-Score needs history)
        const fetchStart = APRIL_START - (10 * DAY_MS); 
        assetData[asset] = await fetchCandlesChunked(info, asset, fetchStart, APRIL_END);
        console.log(`✅ Loaded ${assetData[asset].length} candles for ${asset}`);
    }

    // Align timestamps across all assets
    const allTs = new Set<number>();
    Object.values(assetData).forEach(candles => candles.forEach(c => {
        if (c.t >= APRIL_START && c.t < APRIL_END) allTs.add(c.t);
    }));
    const sortedTs = Array.from(allTs).sort((a,b) => a - b);

    let balance = 1000.0; // Start with $1000 for clarity
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

    console.log(`\nStarting simulation with $${balance.toFixed(2)} balance...`);

    for (const t of sortedTs) {
        // 1. Manage Active Position
        if (activePosition) {
            const candles = assetData[activePosition.asset];
            const c = candles.find(cand => cand.t === t);
            
            if (c) {
                const isLong = activePosition.dir === "LONG";
                const high = c.h;
                const low = c.l;
                const close = c.c;
                
                // Calculate current PnL %
                const currentPnlPct = ((close - activePosition.entry) / activePosition.entry * 100) * (isLong ? 1 : -1);
                
                // Track peak for trailing
                if (currentPnlPct > activePosition.peakPnl) {
                    activePosition.peakPnl = currentPnlPct;
                }

                let exitReason = "";
                let exitPrice = 0;

                // Check Hard Stop Loss (1.3%)
                const slPrice = isLong ? activePosition.entry * (1 - STOP_LOSS_PCT/100) : activePosition.entry * (1 + STOP_LOSS_PCT/100);
                if (isLong ? low <= slPrice : high >= slPrice) {
                    exitReason = "STOP_LOSS";
                    exitPrice = slPrice;
                } 
                // Check Trailing Take Profit
                else if (activePosition.peakPnl >= TRAILING_START) {
                    const trailingTrigger = activePosition.peakPnl - TRAILING_CALLBACK;
                    if (currentPnlPct < trailingTrigger) {
                        exitReason = "TRAILING_TP";
                        exitPrice = close; // Realistic: close at current bar
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
                        entry: activePosition.entry,
                        exit: exitPrice,
                        pnlUsdc,
                        pnlPct: pnlFactor * 100 * LEVERAGE,
                        reason: exitReason,
                        time: new Date(t).toISOString()
                    });
                    
                    activePosition = null;
                }
            }
        }

        // 2. Scan for New Entry (Only if no active position)
        if (!activePosition) {
            const candidates: any[] = [];
            for (const asset of assets) {
                const candles = assetData[asset];
                const idx = candles.findIndex(cand => cand.t === t);
                if (idx < 100) continue;

                // Use the REAL technical logic
                const sig = analyzeChameleonWick(candles.slice(0, idx + 1));
                
                if (sig.direction !== "NEUTRAL") {
                    candidates.push({ 
                        asset, 
                        direction: sig.direction, 
                        price: candles[idx].c,
                        score: Math.abs(sig.zScore || 0) * (sig.volSurge || 1)
                    });
                }
            }

            if (candidates.length > 0) {
                // Pick the most extreme signal
                const best = candidates.sort((a,b) => b.score - a.score)[0];
                
                const margin = balance * MARGIN_PCT;
                activePosition = {
                    asset: best.asset,
                    dir: best.direction,
                    entry: best.price,
                    margin,
                    peakPnl: 0,
                    startTime: t
                };
            }
        }
    }

    // --- REPORT GENERATION ---
    const netProfit = balance - initialBalance;
    const roi = (netProfit / initialBalance) * 100;
    const winTrades = tradeHistory.filter(h => h.pnlUsdc > 0);
    const winRate = (winTrades.length / tradeHistory.length) * 100;

    const report = `
# 👑 HYPERSCALPERX BACKTEST REPORT 👑
## Strategy: Chameleon Sniper V3 (SULTAN MODE)
## Period: April 2026 (Last 1 Month)

### 📊 Performance Summary
- **Initial Balance**: $${initialBalance.toFixed(2)}
- **Final Balance**: $${balance.toFixed(2)}
- **Net Profit**: $${netProfit.toFixed(2)} (${roi.toFixed(2)}% ROI)
- **Max Drawdown**: ${maxDrawdown.toFixed(2)}%
- **Total Trades**: ${tradeHistory.length}
- **Win Rate**: ${winRate.toFixed(1)}%
- **Winning Trades**: ${winTrades.length}
- **Losing Trades**: ${tradeHistory.length - winTrades.length}

### 📈 Trade Details (Last 10)
${tradeHistory.slice(-10).map(h => `- **${h.asset}** ${h.dir}: ${h.pnlPct.toFixed(2)}% PnL ($${h.pnlUsdc.toFixed(2)}) via ${h.reason}`).join("\n")}

---
*Backtest executed on real Hyperliquid historical data with 15m resolution.*
`;

    console.log(report);
    fs.writeFileSync("backtest_april_report.md", report);
    console.log("✅ Report saved to backtest_april_report.md");
}

runBacktest().catch(console.error);
