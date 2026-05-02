import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyzeBreakout, type Candle } from "../src/survival/technicals.js";
import * as fs from "fs";

const DAY_SEC = 24 * 60 * 60;

async function fetchCandlesChunked(info: InfoClient, coin: string, startTime: number, endTime: number): Promise<Candle[]> {
    let currentStart = startTime;
    const intervalMs = 15 * DAY_SEC * 1000;
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
            await new Promise(r => setTimeout(r, 60));
        } catch (e) { }
        currentStart = chunkEnd;
    }
    const unique = new Map();
    allCandles.forEach(c => unique.set(c.t, c));
    return Array.from(unique.values()).sort((a,b) => a.t - b.t);
}

async function runScenario(info: InfoClient, assets: string[], leverages: Record<string, number>, days: number) {
    const endTime = Date.now();
    const startTime = endTime - days * DAY_SEC * 1000;
    
    console.log(`\n⏳ Running ${days}-Day Scenario...`);
    
    const assetData: Record<string, Candle[]> = {};
    for (const asset of assets) {
        assetData[asset] = await fetchCandlesChunked(info, asset, startTime, endTime);
        console.log(`   - ${asset}: ${assetData[asset].length} candles`);
    }

    const allTs = new Set<number>();
    Object.values(assetData).forEach(candles => candles.forEach(c => allTs.add(c.t)));
    const sortedTs = Array.from(allTs).sort((a,b) => a - b);

    let balance = 100;
    const maxPositions = 2;
    const riskPct = 0.70;
    const openPositions: any[] = [];
    const tradeHistory: any[] = [];

    for (const t of sortedTs) {
        for (let i = openPositions.length - 1; i >= 0; i--) {
            const pos = openPositions[i];
            const candles = assetData[pos.asset];
            const c = candles.find(cand => cand.t === t);
            if (!c) continue;

            let outcome = null;
            if (pos.dir === "LONG") {
                if (c.l <= pos.sl) outcome = "SL";
                else if (c.h >= pos.tp) outcome = "TP";
            } else {
                if (c.h >= pos.sl) outcome = "SL";
                else if (c.l <= pos.tp) outcome = "TP";
            }

            if (outcome) {
                const pnlFactor = outcome === "TP" ? (pos.tpPct / 100) : -(pos.slPct / 100);
                const pnlUsdc = pos.margin * pos.lev * pnlFactor;
                balance += pnlUsdc;
                tradeHistory.push({ asset: pos.asset, pnlUsdc });
                openPositions.splice(i, 1);
            }
        }

        if (openPositions.length < maxPositions) {
            const candidates: any[] = [];
            for (const asset of assets) {
                if (openPositions.find(p => p.asset === asset)) continue;
                const candles = assetData[asset];
                const idx = candles.findIndex(cand => cand.t === t);
                if (idx < 100) continue;

                const sig = analyzeBreakout(candles.slice(idx - 100, idx + 1), 0, {
                    volumeSurgeThreshold: 2.4, atrTpMultiplier: 2.0, atrSlMultiplier: 2.0, confBase: 40
                });

                if (sig.direction !== "NEUTRAL") {
                    candidates.push({ asset, direction: sig.direction, signal: sig, candle: candles[idx] });
                }
            }
            candidates.sort((a,b) => b.signal.indicators.volumeSurge - a.signal.indicators.volumeSurge);

            for (const cand of candidates) {
                if (openPositions.length >= maxPositions) break;
                const entry = cand.candle.c;
                const lev = leverages[cand.asset];
                const margin = (balance / maxPositions) * riskPct;
                if (margin < 1) continue;

                openPositions.push({
                    asset: cand.asset, dir: cand.direction, lev, margin, entry,
                    tp: cand.direction === "LONG" ? entry * (1 + cand.signal.dynamicTP/100) : entry * (1 - cand.signal.dynamicTP/100),
                    sl: cand.direction === "LONG" ? entry * (1 - cand.signal.dynamicSL/100) : entry * (1 + cand.signal.dynamicSL/100),
                    tpPct: cand.signal.dynamicTP, slPct: cand.signal.dynamicSL
                });
            }
        }
    }

    const wins = tradeHistory.filter(t => t.pnlUsdc > 0).length;
    return {
        days,
        finalBalance: balance.toFixed(2),
        roi: (balance - 100).toFixed(2) + "%",
        trades: tradeHistory.length,
        winRate: ((wins / tradeHistory.length) * 100).toFixed(1) + "%"
    };
}

async function runMultiScenario() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    
    const assets = ["DOGE", "SOL", "SEI", "WLD", "AAVE"];
    const leverages: Record<string, number> = { "DOGE": 10, "SOL": 10, "SEI": 5, "WLD": 10, "AAVE": 10 };
    
    console.log(`📡 Multi-Scenario Backtest for: ${assets.join(", ")}`);
    
    const results = [];
    results.push(await runScenario(info, assets, leverages, 60));
    results.push(await runScenario(info, assets, leverages, 120));
    results.push(await runScenario(info, assets, leverages, 180));
    
    console.log("\n🏆 FINAL COMPARISON TABLE:");
    console.table(results);
}

runMultiScenario().catch(console.error);
