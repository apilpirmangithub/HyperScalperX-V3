/**
 * HypeKing: Universal Asset Auditor (The 1H Holy Grail) 🔒🔎💎
 * Scans every asset on HL for 13/13 Green Week performance.
 */

import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyze, type Candle } from "../src/survival/technicals.js";
import * as fs from "fs";

const DAY_SEC = 24 * 60 * 60;
const LOOKBACK_DAYS = 90;

async function fetchCandlesChunked(info: InfoClient, coin: string, startTime: number, endTime: number): Promise<Candle[]> {
    let currentStart = startTime;
    const intervalMs = 15 * DAY_SEC * 1000;
    let allCandles: Candle[] = [];
    while (currentStart < endTime) {
        const chunkEnd = Math.min(currentStart + intervalMs, endTime);
        try {
            const raw = await info.candleSnapshot({ coin, interval: "1h", startTime: currentStart, endTime: chunkEnd }) as any[];
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

async function runAudit() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    const meta = await info.meta() as any;
    const allAssets = meta.universe.map((u: any) => u.name);
    
    console.log(`📡 Starting Universal Audit for ${allAssets.length} assets...`);
    
    const endTime = Date.now();
    const startTime = endTime - LOOKBACK_DAYS * DAY_SEC * 1000;
    const winners: any[] = [];

    const weekMs = 7 * DAY_SEC * 1000;
    const bins: { start: number; end: number }[] = [];
    let ws = startTime;
    while (ws < endTime) { bins.push({ start: ws, end: Math.min(ws + weekMs, endTime) }); ws += weekMs; }

    for (const asset of allAssets) {
        process.stdout.write(`\r🔍 Auditing ${asset}... `);
        const candles = await fetchCandlesChunked(info, asset, startTime, endTime);
        if (candles.length < 500) continue;

        // Pre-calc signals
        const signals: any[] = [];
        for (let i = 100; i < candles.length; i++) {
            const sig = analyze(candles.slice(i - 150, i + 1));
            if (sig.direction !== "NEUTRAL") signals.push({ t: candles[i].t, ...sig });
        }

        // Test combos
        const tpGrid = [1.5, 2.0, 3.0], slGrid = [1.0, 1.5], confGrid = [45, 50];
        for (const conf of confGrid) {
            for (const tp of tpGrid) {
                for (const sl of slGrid) {
                    let modal = 100, activeTrade = null;
                    const weeklyPnl: number[] = [];
                    let weekStartModal = modal, curBinIdx = 0;

                    for (const c of candles) {
                        while (curBinIdx < bins.length - 1 && c.t >= bins[curBinIdx].end) {
                            weeklyPnl.push(modal - weekStartModal);
                            weekStartModal = modal; curBinIdx++;
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
                                const mult = outcome === "TP" ? activeTrade.tpProf : -activeTrade.slLoss;
                                modal += modal * 0.9 * 10 * mult; // simulating 90% risk 10x leverage leverage
                                activeTrade = null;
                            }
                        } else {
                            const sig = signals.find(s => s.t === c.t && s.confidence >= conf);
                            if (sig) {
                                const entry = c.c;
                                const tpPct = (sig.dynamicTP * tp)/100, slPct = (sig.dynamicSL * sl)/100;
                                activeTrade = { dir: sig.direction, sl: sig.direction === "LONG"? entry*(1-slPct) : entry*(1+slPct), tp: sig.direction === "LONG"? entry*(1+tpPct) : entry*(1-tpPct), tpProf: tpPct, slLoss: slPct };
                            }
                        }
                    }
                    weeklyPnl.push(modal - weekStartModal);
                    const greenWeeks = weeklyPnl.filter(p => p >= -0.01).length;
                    if (greenWeeks === weeklyPnl.length && modal > 105) {
                        winners.push({ asset, conf, tp, sl, roi: ((modal-100)/100)*100, winRate: 100 });
                    }
                }
            }
        }
    }

    console.log("\n\n🏆 UNIVERSAL INDIVIDUAL CHAMPIONS (13/13 Green Weeks):");
    winners.sort((a,b) => b.roi - a.roi);
    fs.writeFileSync("universal_winners.json", JSON.stringify(winners, null, 2));
    winners.slice(0, 50).forEach(w => console.log(`💎 ${w.asset}: ROI ${w.roi.toFixed(1)}% | Conf:${w.conf} TP:${w.tp} SL:${w.sl}`));
}

runAudit();
