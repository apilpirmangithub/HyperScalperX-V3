/**
 * SULTAN HYPER-OPTIMIZER v2.3 (INDEX MASTER) 🏹🌪️🌌
 */

import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyze, type Candle } from "../src/survival/technicals.js";
import * as fs from 'fs';

const ASSETS = ["MEME", "DOGE", "ADA", "TIA", "AVAX", "OP", "INJ", "ARB"];
const START_MODAL = 26.43;
const LEVERAGE = 10;
const LOOKBACK_DAYS = 180; 
const DAY_SEC = 24 * 60 * 60;

const TP_VALUES = [2.0, 3.0, 4.0, 5.0];
const SL_VALUES = [1.0, 1.5, 2.0];
const CONF_VALUES = [30, 35, 40];
const PYRAMID_VALUES = [true, false];
const RISK_VALUES = [0.33, 0.50, 0.75, 0.95];

async function fetchCandles(info: InfoClient, coin: string, startTime: number, endTime: number): Promise<Candle[]> {
    let currentStart = startTime;
    const intervalMs = 15 * DAY_SEC * 1000; 
    let allCandles: Candle[] = [];
    while (currentStart < endTime) {
        const chunkEnd = Math.min(currentStart + intervalMs, endTime);
        try {
            const raw = await info.candleSnapshot({ 
                coin, interval: "1h", startTime: currentStart, endTime: chunkEnd 
            }) as any[];
            if (raw && raw.length > 0) {
                const parsed = raw.map(c => ({
                    t: c.t, o: parseFloat(c.o), h: parseFloat(c.h), l: parseFloat(c.l),
                    c: parseFloat(c.c), v: parseFloat(c.v), n: c.n
                }));
                allCandles = allCandles.concat(parsed);
            }
        } catch (e) { }
        currentStart = chunkEnd;
        await new Promise(r => setTimeout(r, 50));
    }
    const filtered = allCandles.filter(c => c.t >= startTime && c.t <= endTime);
    return filtered.sort((a, b) => a.t - b.t);
}

async function runOptimizer() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    const endTime = Date.now();
    const startTime = endTime - LOOKBACK_DAYS * DAY_SEC * 1000;

    const marketMap: Record<string, Map<number, Candle>> = {};
    const timelines: Record<string, number[]> = {};

    for (const asset of ASSETS) {
        process.stdout.write(`Loading ${asset}... `);
        const candles = await fetchCandles(info, asset, startTime, endTime);
        const map = new Map<number, Candle>();
        candles.forEach(c => map.set(c.t, c));
        marketMap[asset] = map;
        timelines[asset] = candles.map(c => c.t);
        console.log(`[${candles.length}]`);
    }

    const results: any[] = [];
    const H1_MS = 3600000;
    
    // Find absolute start and end across all assets
    let minT = Infinity, maxT = 0;
    for (const asset of ASSETS) {
        if (timelines[asset].length === 0) continue;
        minT = Math.min(minT, timelines[asset][0]);
        maxT = Math.max(maxT, timelines[asset][timelines[asset].length - 1]);
    }

    let count = 0;
    const totalCombos = TP_VALUES.length * SL_VALUES.length * CONF_VALUES.length * PYRAMID_VALUES.length * RISK_VALUES.length;

    for (const tpM of TP_VALUES) {
        for (const slM of SL_VALUES) {
            for (const confM of CONF_VALUES) {
                for (const pyrM of PYRAMID_VALUES) {
                    for (const riskM of RISK_VALUES) {
                        count++;
                        let modal = START_MODAL;
                        let activeTrades: any[] = [];
                        let totalTrades = 0;

                        // Simulation Loop
                        for (let currentT = minT + (200 * H1_MS); currentT <= maxT; currentT += H1_MS) {
                            // 1. Process Exits
                            const remaining: any[] = [];
                            for (const tr of activeTrades) {
                                const candle = marketMap[tr.asset].get(currentT);
                                if (!candle) { remaining.push(tr); continue; }

                                const pnlPct = tr.direction === "LONG" ? (candle.c - tr.entryPrice)/tr.entryPrice * 100 : (tr.entryPrice - candle.c)/tr.entryPrice * 100;
                                const targetPnlPct = Math.abs((tr.tpPrice - tr.entryPrice)/tr.entryPrice * 100);

                                if (pyrM && !tr.pyramided && (pnlPct / targetPnlPct) >= 0.5) {
                                    const add = tr.margin * 0.5;
                                    if (modal >= add) { modal -= add; tr.margin += add; tr.pyramided = true; }
                                }

                                let outcome = null;
                                if (tr.direction === "LONG") {
                                    if (candle.l <= tr.slPrice) outcome = "SL";
                                    else if (candle.h >= tr.tpPrice) outcome = "TP";
                                } else {
                                    if (candle.h >= tr.slPrice) outcome = "SL";
                                    else if (candle.l <= tr.tpPrice) outcome = "TP";
                                }

                                if (outcome) {
                                    const tradePnlPct = (outcome === "TP" ? targetPnlPct : -Math.abs((tr.slPrice - tr.entryPrice)/tr.entryPrice * 100));
                                    modal += (tr.margin * LEVERAGE * (tradePnlPct/100)) * 0.99;
                                    totalTrades++;
                                } else { remaining.push(tr); }
                            }
                            activeTrades = remaining;
                            if (modal <= 1) break;

                            // 2. Open New Trades
                            if (activeTrades.length < 3) {
                                for (const asset of ASSETS) {
                                    if (activeTrades.length >= 3) break;
                                    if (activeTrades.some(t => t.asset === asset)) continue;
                                    
                                    const assetTimeline = timelines[asset];
                                    const idx = assetTimeline.indexOf(currentT);
                                    if (idx < 200) continue;

                                    const history: Candle[] = [];
                                    for(let i = idx - 199; i <= idx; i++) {
                                        history.push(marketMap[asset].get(assetTimeline[i])!);
                                    }

                                    const signal = analyze(history);
                                    if (signal.direction !== "NEUTRAL" && signal.confidence >= confM) {
                                        const lastC = history[history.length-1].c;
                                        const tpPct = signal.indicators.atrPct * tpM;
                                        const slPct = signal.indicators.atrPct * slM;
                                        const margin = modal * riskM;
                                        
                                        if (modal >= margin && margin >= 0.5) {
                                            modal -= 0; // Margin subtracted from power, but for calc simplicity:
                                            activeTrades.push({
                                                asset, direction: signal.direction, entryPrice: lastC,
                                                tpPrice: signal.direction === "LONG" ? lastC * (1 + tpPct/100) : lastC * (1 - tpPct/100),
                                                slPrice: signal.direction === "LONG" ? lastC * (1 - slPct/100) : lastC * (1 + slPct/100),
                                                margin, pyramided: false
                                            });
                                        }
                                    }
                                }
                            }
                        }

                        if (modal > START_MODAL) {
                            results.push({ tpM, slM, confM, pyrM, riskM, final: modal, roi: (modal-START_MODAL)/START_MODAL*100, trades: totalTrades });
                        }
                    }
                }
            }
        }
        process.stdout.write(".");
    }

    results.sort((a, b) => b.final - a.final);
    console.log(`\n\n🎯 FOUND ${results.length} PROFITABLE COMBINATIONS!`);
    results.slice(0, 10).forEach((r, i) => {
        console.log(`${i+1}. ROI: +${r.roi.toFixed(1)}% | Trades:${r.trades} | Parameters: TP:${r.tpM} SL:${r.slM} CONF:${r.confM} PYR:${r.pyrM} RISK:${(r.riskM*100).toFixed(0)}%`);
    });

    fs.writeFileSync('./optimizer_results.json', JSON.stringify(results.slice(0, 50), null, 2));
}

runOptimizer();
