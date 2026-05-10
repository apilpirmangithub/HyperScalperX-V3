import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyzeChameleonWick, type Candle, setStrategyConfig } from "../src/survival/technicals.js";
import * as fs from "fs";

const DAY_MS = 24 * 60 * 60 * 1000;
const END_TIME = Date.now();
const START_TIME = END_TIME - (30 * DAY_MS);

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
            await new Promise(r => setTimeout(r, 50)); 
        } catch (e) { }
        currentStart = chunkEnd;
    }
    const unique = new Map();
    allCandles.forEach(c => unique.set(c.t, c));
    return Array.from(unique.values()).sort((a,b) => a.t - b.t);
}

async function runOptimization() {
    console.log("🔥 STARTING BRUTE-FORCE STRATEGY OPTIMIZATION 🔥");
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    const assets = ["SOL", "ETH", "BTC", "NEAR", "AVAX", "OP", "ARB", "JTO", "TIA", "SUI", "LINK", "FET", "WLD", "AAVE", "LTC"];
    
    console.log(`📡 Fetching market data for ${assets.length} assets...`);
    const assetData: Record<string, Candle[]> = {};
    for (const asset of assets) {
        const fetchStart = START_TIME - (3 * DAY_MS);
        assetData[asset] = await fetchCandlesChunked(info, asset, fetchStart, END_TIME);
    }

    const allTs = new Set<number>();
    Object.values(assetData).forEach(candles => candles.forEach(c => {
        if (c.t >= START_TIME && c.t < END_TIME) allTs.add(c.t);
    }));
    const sortedTs = Array.from(allTs).sort((a,b) => a - b);

    // BRUTE FORCE RANGES - EXPANDED TO HUNDREDS OF COMBINATIONS
    const zRanges = [2.5, 2.8, 3.2, 3.5, 3.8, 4.2, 4.5]; // 7 options
    const slRanges = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0];    // 6 options
    const trailStartRanges = [0.8, 1.2, 1.8, 2.5, 3.5]; // 5 options
    const wickRanges = [0.02, 0.05, 0.10];              // 3 options
    // Total: 7 * 6 * 5 * 3 = 630 Combinations
    
    let bestResult = { roi: -999, params: {} };
    const results = [];

    for (const z of zRanges) {
        for (const sl of slRanges) {
            for (const ts of trailStartRanges) {
                for (const wk of wickRanges) {
                    setStrategyConfig({ zThreshold: z, sl: sl, wickThreshold: wk });
                    
                    let balance = 20.0;
                    let activePos: any = null;
                    let tradeCount = 0;
                    let wins = 0;

                    for (const t of sortedTs) {
                        if (activePos) {
                            const candles = assetData[activePos.asset];
                            const c = candles.find(cand => cand.t === t);
                            if (c) {
                                const isLong = activePos.dir === "LONG";
                                const pnlPct = ((c.c - activePos.entry) / activePos.entry * 100) * (isLong ? 1 : -1);
                                if (pnlPct > activePos.peak) activePos.peak = pnlPct;

                                let exit = "";
                                const slPrice = isLong ? activePos.entry * (1 - sl/100) : activePos.entry * (1 + sl/100);
                                
                                if (isLong ? c.l <= slPrice : c.h >= slPrice) {
                                    exit = "SL";
                                } else if (activePos.peak >= ts && pnlPct <= activePos.peak - 0.5) {
                                    exit = "TP";
                                }

                                if (exit) {
                                    const exitPrice = exit === "SL" ? slPrice : (isLong ? activePos.entry * (1 + (activePos.peak - 0.5)/100) : activePos.entry * (1 - (activePos.peak - 0.5)/100));
                                    const actualPnlPct = ((exitPrice - activePos.entry) / activePos.entry * 100) * (isLong ? 1 : -1);
                                    const grossPnl = activePos.size * Math.abs(exitPrice - activePos.entry) * (actualPnlPct > 0 ? 1 : -1);
                                    const fee = (activePos.size * activePos.entry + activePos.size * exitPrice) * 0.0004;
                                    balance += (grossPnl - fee);
                                    tradeCount++;
                                    if (actualPnlPct > 0) wins++;
                                    activePos = null;
                                }
                            }
                        }

                        if (!activePos && balance > 5) {
                            let bestSig: any = null;
                            for (const asset of assets) {
                                const candles = assetData[asset];
                                const idx = candles.findIndex(cand => cand.t === t);
                                if (idx < 100) continue;
                                const sig = analyzeChameleonWick(candles.slice(0, idx + 1));
                                if (sig.direction !== "NEUTRAL") {
                                    const score = Math.abs(sig.zScore) * sig.volSurge;
                                    if (!bestSig || score > bestSig.score) {
                                        bestSig = { asset, direction: sig.direction, score, entry: candles[idx].c };
                                    }
                                }
                            }
                            if (bestSig) {
                                const margin = (balance - 0.5) * 0.4;
                                activePos = { 
                                    asset: bestSig.asset, dir: bestSig.direction, entry: bestSig.entry, 
                                    size: (margin * 0.95 * 20) / bestSig.entry, peak: 0 
                                };
                            }
                        }
                    }

                    const roi = ((balance - 20) / 20) * 100;
                    if (roi > bestResult.roi) {
                        bestResult = { roi, params: { z, sl, ts, wk } };
                        console.log(`NEW BEST: ROI ${roi.toFixed(2)}% | Z=${z} SL=${sl} Trail=${ts} Wick=${wk}`);
                    }
                    results.push({ z, sl, ts, wk, roi, tradeCount, winRate: (wins/tradeCount)*100 });
                }
            }
        }
    }

    console.log("\n🏆 BEST PARAMS FOUND 🏆");
    console.log(JSON.stringify(bestResult, null, 2));
    fs.writeFileSync("brute_force_results.json", JSON.stringify(results, null, 2));
}

runOptimization().catch(console.error);
