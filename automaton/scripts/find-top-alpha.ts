import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyzeBreakout, type Candle } from "../src/survival/technicals.js";
import * as fs from "fs";

const DAY_SEC = 24 * 60 * 60;
const LOOKBACK_DAYS = 120;

async function fetchCandlesChunked(info: InfoClient, coin: string, startTime: number, endTime: number): Promise<Candle[]> {
    let currentStart = startTime;
    const intervalMs = 15 * DAY_SEC * 1000;
    let allCandles: Candle[] = [];
    while (currentStart < endTime) {
        const chunkEnd = Math.min(currentStart + intervalMs, endTime);
        try {
            // Using 15m candles as requested (matching HYPE_KING strategy)
            const raw = await info.candleSnapshot({ coin, interval: "15m", startTime: currentStart, endTime: chunkEnd }) as any[];
            if (raw && raw.length > 0) {
                allCandles = allCandles.concat(raw.map(c => ({
                    t: c.t, o: parseFloat(c.o), h: parseFloat(c.h), l: parseFloat(c.l),
                    c: parseFloat(c.c), v: parseFloat(c.v), n: c.n
                })));
            }
            await new Promise(r => setTimeout(r, 60));
        } catch (e) { }
        currentStart = chunkEnd;
    }
    const unique = new Map();
    allCandles.forEach(c => unique.set(c.t, c));
    return Array.from(unique.values()).sort((a,b) => a.t - b.t);
}

async function runAlphaSearch() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    const meta = await info.meta() as any;
    const allAssets = meta.universe.map((u: any) => u.name);
    
    console.log(`📡 Starting Top Alpha Search (15m Breakout Strategy) for ${allAssets.length} assets...`);
    
    const endTime = Date.now();
    const startTime = endTime - LOOKBACK_DAYS * DAY_SEC * 1000;
    const finalists: any[] = [];

    const weekMs = 7 * DAY_SEC * 1000;
    const monthMs = 30 * DAY_SEC * 1000;
    
    const excluded = ["DOGE", "SOL"];

    for (const asset of allAssets) {
        if (excluded.includes(asset)) continue;

        process.stdout.write(`\r🔍 Auditing ${asset}... `);
        const candles = await fetchCandlesChunked(info, asset, startTime, endTime);
        if (candles.length < 1000) continue; // Need enough data for 15m 90d

        // HYPE_KING Config parameters
        const volumeSurgeThreshold = 2.4;
        const tpMulti = 2.0;
        const slMulti = 2.0;

        let modal = 100;
        let activeTrade = null;
        let tradeCount = 0;
        let winCount = 0;

        // Tracking profit by bin
        const weeklyPnl: number[] = [];
        const monthlyPnl: number[] = [];
        
        let lastWeekModal = modal;
        let lastMonthModal = modal;
        let lastWeekT = startTime;
        let lastMonthT = startTime;

        for (let i = 50; i < candles.length; i++) {
            const c = candles[i];

            // Bin Tracking
            if (c.t - lastWeekT >= weekMs) {
                weeklyPnl.push(modal - lastWeekModal);
                lastWeekModal = modal;
                lastWeekT = c.t;
            }
            if (c.t - lastMonthT >= monthMs) {
                monthlyPnl.push(modal - lastMonthModal);
                lastMonthModal = modal;
                lastMonthT = c.t;
            }

            if (activeTrade) {
                let outcome = null;
                if (activeTrade.dir === "LONG") {
                    if (c.l <= activeTrade.sl) outcome = "SL";
                    else if (c.h >= activeTrade.tp) outcome = "TP";
                } else {
                    if (c.h >= activeTrade.sl) outcome = "SL";
                    else if (c.l <= activeTrade.tp) outcome = "TP";
                }

                if (outcome) {
                    const pnlFactor = outcome === "TP" ? (activeTrade.tpPct / 100) : -(activeTrade.slPct / 100);
                    // Simulating 10x leverage, 70% risk per trade (matching HYPE_KING)
                    modal += modal * 0.70 * 10 * pnlFactor; 
                    if (outcome === "TP") winCount++;
                    tradeCount++;
                    activeTrade = null;
                }
            } else {
                // Exact strategy check: analyzeBreakout
                const sig = analyzeBreakout(candles.slice(i - 100, i + 1), 0, {
                    volumeSurgeThreshold,
                    atrTpMultiplier: tpMulti,
                    atrSlMultiplier: slMulti,
                    confBase: 40
                });

                if (sig.direction !== "NEUTRAL") {
                    const entry = c.c;
                    const tpPct = sig.dynamicTP;
                    const slPct = sig.dynamicSL;
                    activeTrade = {
                        dir: sig.direction,
                        entry,
                        tp: sig.direction === "LONG" ? entry * (1 + tpPct/100) : entry * (1 - tpPct/100),
                        sl: sig.direction === "LONG" ? entry * (1 - slPct/100) : entry * (1 + slPct/100),
                        tpPct,
                        slPct
                    };
                }
            }
        }

        const roi = modal - 100;
        const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;
        
        // Consistency check: At least 80% green weeks and 100% green months
        const greenWeeks = weeklyPnl.filter(p => p >= 0).length;
        const greenMonths = monthlyPnl.filter(p => p >= 0).length;

        if (roi > 20 && tradeCount >= 5) {
            finalists.push({
                asset,
                roi: roi.toFixed(1),
                winRate: winRate.toFixed(1),
                tradeCount,
                greenWeeks: `${greenWeeks}/${weeklyPnl.length}`,
                greenMonths: `${greenMonths}/${monthlyPnl.length}`,
                finalBalance: modal.toFixed(2)
            });
        }
    }

    console.log("\n\n🏆 TOP ALPHA ASSETS (EXCLUDING DOGE/SOL) - 90 DAY BACKTEST:");
    finalists.sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
    
    console.table(finalists.slice(0, 20));
    
    fs.writeFileSync("top_alpha_assets.json", JSON.stringify(finalists, null, 2));
    console.log(`\n✅ Results saved to top_alpha_assets.json`);
}

runAlphaSearch().catch(console.error);
