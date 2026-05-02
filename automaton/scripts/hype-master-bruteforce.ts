/**
 * HYPE MASTER BRUTEFORCE 🧬💥
 * Thousands of tactics directed exclusively at the HYPE token over 60 Days.
 * Tests Wick Reversion vs Trend Continuation with and without Pyramid Scaling!
 */

import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import * as fs from 'fs';

const COIN = "HYPE";
const START_MODAL = 26.43;
const LEVERAGE = 10;
const LOOKBACK_DAYS = 60; // 2 FULL MONTHS
const DAY_SEC = 24 * 60 * 60;
const INTERVAL = "15m";
const INTERVAL_MS = 900000;

interface Candle { t: number; o: number; h: number; l: number; c: number; v: number; n: number; }

// Simple RSI for the simulator
function calcRSI(closes: number[], period: number = 14): number {
    if (closes.length <= period) return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const change = closes[i] - closes[i-1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    const rs = (gains/period) / ((losses/period) || Number.MIN_VALUE);
    return 100 - (100 / (1 + rs));
}

// Simple Bollinger Bands
function calcBB(closes: number[], period: number = 20): { upper: number, lower: number, basis: number } {
    if (closes.length < period) return { upper: 0, lower: 0, basis: 0 };
    const slice = closes.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    return { basis: mean, upper: mean + 2*stdDev, lower: mean - 2*stdDev };
}

// Simple SMA volume
function calcVolAvg(vols: number[], period: number = 20): number {
    if (vols.length < period) return 0;
    const slice = vols.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
}

// ATR
function calcAtr(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) return 0;
    let sumTr = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
        const c = candles[i];
        const pc = candles[i-1];
        const tr = Math.max(c.h - c.l, Math.abs(c.h - pc.c), Math.abs(c.l - pc.c));
        sumTr += tr;
    }
    return sumTr / period;
}

async function fetchCandles(info: InfoClient, coin: string, interval: string, startTime: number, endTime: number): Promise<Candle[]> {
    let currentStart = startTime;
    const intervalMs = 2 * DAY_SEC * 1000; 
    let allCandles: Candle[] = [];
    while (currentStart < endTime) {
        const chunkEnd = Math.min(currentStart + intervalMs, endTime);
        try {
            const raw = await info.candleSnapshot({ 
                coin, interval: interval as any, startTime: currentStart, endTime: chunkEnd 
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
        await new Promise(r => setTimeout(r, 20)); // Rate limit safety
    }
    return allCandles.sort((a, b) => a.t - b.t);
}

async function startHypeMatrix() {
    console.log(`\n============== [HYPE MASTER TACTICIAN] ==============`);
    console.log(`Downloading 60 days of ${COIN} (15m)...`);
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    const endTime = Date.now();
    const startTime = endTime - LOOKBACK_DAYS * DAY_SEC * 1000;

    const candles = await fetchCandles(info, COIN, INTERVAL, startTime, endTime);
    console.log(`✅ Collected ${candles.length} candles for ${COIN}.`);

    // HYPE SPECIFIC MATRIX SEARCH SPACE - 864 Combinations!
    const LOGICS = ["BREAKOUT", "MEAN_REVERSION"]; // 2
    const TP_OPTIONS = [1.0, 2.0, 3.5, 5.0]; // 4
    const SL_OPTIONS = [1.0, 1.5, 3.0]; // 3
    const RISK_OPTIONS = [0.1, 0.25, 0.4]; // 3
    const PYRAMID_OPTS = [0, 1, 2]; // 3
    const VOL_OPTS = [1.2, 1.8]; // 2
    const CONF_OPTS = [40, 50]; // 2

    const totalCombos = LOGICS.length * TP_OPTIONS.length * SL_OPTIONS.length * RISK_OPTIONS.length * PYRAMID_OPTS.length * VOL_OPTS.length * CONF_OPTS.length;
    console.log(`\n🌪️ STARTING HYPER-GRID SIMULATION (${totalCombos} Combos)...`);

    let bestResults: any[] = [];
    let processed = 0;

    for (const logic of LOGICS) {
    for (const tp of TP_OPTIONS) {
    for (const sl of SL_OPTIONS) {
    for (const risk of RISK_OPTIONS) {
    for (const pyr of PYRAMID_OPTS) {
    for (const volM of VOL_OPTS) {
    for (const conf of CONF_OPTS) {
        processed++;
        let modal = START_MODAL;
        let tHistory: any[] = [];
        let activeTrade: any = null; // Only 1 trade at a time since it's only 1 coin!
        let maxDrawdown = 0;
        let peakModal = START_MODAL;

        for (let i = 200; i < candles.length; i++) {
            const currentC = candles[i];
            
            // Check exits if open
            if (activeTrade) {
                let outcome = null;
                const isL = activeTrade.dir === "LONG";
                
                if (isL) {
                    if (currentC.l <= activeTrade.slPrice) outcome = "SL";
                    else if (currentC.h >= activeTrade.tpPrice) outcome = "TP";
                } else {
                    if (currentC.h >= activeTrade.slPrice) outcome = "SL";
                    else if (currentC.l <= activeTrade.tpPrice) outcome = "TP";
                }

                if (outcome) {
                    const pnlFactor = outcome === "TP" 
                        ? (activeTrade.tpPrice - activeTrade.avgEntry)/activeTrade.avgEntry 
                        : (activeTrade.slPrice - activeTrade.avgEntry)/activeTrade.avgEntry;
                    
                    const tradePnl = activeTrade.margin * LEVERAGE * (isL ? pnlFactor : -pnlFactor);
                    modal += tradePnl * 0.9993; // Fees
                    if (modal > peakModal) peakModal = modal;
                    const dd = (peakModal - modal)/peakModal * 100;
                    if (dd > maxDrawdown) maxDrawdown = dd;

                    tHistory.push({ outcome, pnl: tradePnl });
                    activeTrade = null;
                    if (modal <= 1) break; // REKT
                    continue;
                }

                // Pyramid
                if (pyr > 0 && !activeTrade.pyramided) {
                    const totalDist = isL ? activeTrade.tpPrice - activeTrade.origEntry : activeTrade.origEntry - activeTrade.tpPrice;
                    const traversedDist = isL ? currentC.c - activeTrade.origEntry : activeTrade.origEntry - currentC.c;
                    
                    if (traversedDist >= totalDist * 0.5) {
                        const addMargin = activeTrade.initMargin * pyr;
                        if (modal >= addMargin) {
                            const s1 = (activeTrade.initMargin * LEVERAGE) / activeTrade.origEntry;
                            const s2 = (addMargin * LEVERAGE) / currentC.c;
                            const newAvg = (s1 * activeTrade.origEntry + s2 * currentC.c) / (s1 + s2);
                            
                            activeTrade.slPrice = newAvg; // Breakeven SL
                            activeTrade.avgEntry = newAvg;
                            activeTrade.margin += addMargin;
                            activeTrade.pyramided = true;
                        }
                    }
                }
            } else {
                // Entry scanning
                const slice = candles.slice(i-200, i+1);
                const closes = slice.map(c => c.c);
                const vols = slice.map(c => c.v);
                
                const atrPct = (calcAtr(slice, 14) / currentC.c) * 100;
                const rsi = calcRSI(closes, 14);
                const bb = calcBB(closes, 20);
                const avgV = calcVolAvg(vols, 20);
                
                const volSurge = currentC.v > avgV * volM;
                const body = Math.abs(currentC.c - currentC.o);
                const range = currentC.h - currentC.l;
                const bottomWick = Math.min(currentC.c, currentC.o) - currentC.l;
                const topWick = currentC.h - Math.max(currentC.c, currentC.o);

                let dir = "NEUTRAL";
                let confidence = 0;

                if (logic === "BREAKOUT") {
                    if (volSurge && currentC.c > bb.upper) { dir = "LONG"; confidence = 50; }
                    else if (volSurge && currentC.c < bb.lower) { dir = "SHORT"; confidence = 50; }
                } else if (logic === "MEAN_REVERSION") {
                    // Panic down wick
                    if (bottomWick > body * 1.5 && rsi < 35 && currentC.v > avgV) {
                        dir = "LONG"; confidence = 50;
                    } 
                    // Euphoria top wick
                    else if (topWick > body * 1.5 && rsi > 65 && currentC.v > avgV) {
                        dir = "SHORT"; confidence = 50;
                    }
                }

                if (dir !== "NEUTRAL" && confidence >= conf) {
                    const margin = modal * risk;
                    if (margin > 1) {
                        const dynamicTP = Math.max(0.1, atrPct * tp);
                        const dynamicSL = Math.max(0.1, atrPct * sl);
                        
                        activeTrade = {
                            dir, origEntry: currentC.c, avgEntry: currentC.c,
                            tpPrice: dir === "LONG" ? currentC.c * (1 + dynamicTP/100) : currentC.c * (1 - dynamicTP/100),
                            slPrice: dir === "LONG" ? currentC.c * (1 - dynamicSL/100) : currentC.c * (1 + dynamicSL/100),
                            initMargin: margin, margin: margin, pyramided: false
                        };
                    }
                }
            }
        }

        if (modal > START_MODAL && tHistory.length >= 10 && maxDrawdown < 60) {
            const wins = tHistory.filter(h => h.outcome === "TP").length;
            bestResults.push({
                logic, tp, sl, risk, pyr, volM, 
                finalModal: modal, roi: ((modal-START_MODAL)/START_MODAL)*100,
                winRate: (wins/tHistory.length)*100, maxDrawdown, trades: tHistory.length
            });
        }

        if (processed % 100 === 0) process.stdout.write(".");
    }}}}}}}

    bestResults.sort((a,b) => b.roi - a.roi);
    const top = bestResults.slice(0, 15);

    console.log("\n\n🏆 SULTAN HYPE MASTER (TOP 10 TACTICS FOR 60 DAYS):");
    console.table(top.map(w => ({
        LOGIC: w.logic,
        ROI: w.roi.toFixed(1) + "%",
        WinRate: w.winRate.toFixed(1) + "%",
        MaxDD: w.maxDrawdown.toFixed(1) + "%",
        Trades: w.trades,
        Risk: (w.risk * 100).toFixed(0) + "%",
        Pyramid: w.pyr + "x",
        TP: w.tp + "x",
        SL: w.sl + "x"
    })));

    fs.writeFileSync('./super_brute_hype_master.json', JSON.stringify(top, null, 2));
    console.log("\n✅ Master Configs Saved to super_brute_hype_master.json");
}

startHypeMatrix();
