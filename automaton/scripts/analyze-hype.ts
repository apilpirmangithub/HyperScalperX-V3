/**
 * HYPE COIN ANATOMY ANALYZER 🧬
 * Investigating the micro-structure and personality of 'HYPE' over 60 days.
 */

import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";

const DAY_SEC = 24 * 60 * 60;

interface Candle {
    t: number; o: number; h: number; l: number; c: number; v: number; n: number;
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
        await new Promise(r => setTimeout(r, 20));
    }
    return allCandles.sort((a, b) => a.t - b.t);
}

async function analyzeHypeCharacter() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    
    // Look back 60 days
    const lookbackMs = 60 * 24 * 60 * 60 * 1000;
    const endTime = Date.now();
    const startTime = endTime - lookbackMs;
    
    console.log("🧬 Fetching HYPE 1h Anatomy (60 Days)...");
    const candles = await fetchCandles(info, "HYPE", "1h", startTime, endTime);
    
    if (candles.length === 0) {
        console.log("No data found for HYPE. Exiting.");
        return;
    }

    let totalAtrPct = 0;
    let totalBodyPct = 0;
    let totalWickPct = 0;
    let trendStreaks = { up: 0, down: 0 };
    let currentStreak = { dir: 0, count: 0 }; // 1 up, -1 down
    let maxStreakUp = 0;
    let maxStreakDown = 0;
    let reversals = 0; // instances where a down candle is immediately followed by a bigger up candle

    for (let i = 1; i < candles.length; i++) {
        const c = candles[i];
        const prevC = candles[i-1];
        
        const range = c.h - c.l;
        const rangePct = (range / c.o) * 100;
        totalAtrPct += rangePct;

        const body = Math.abs(c.c - c.o);
        const bodyPct = (body / c.o) * 100;
        totalBodyPct += bodyPct;

        const wick = range - body;
        const wickPct = (wick / c.o) * 100;
        totalWickPct += wickPct;

        // Streaks
        if (c.c > c.o) {
            if (currentStreak.dir === 1) currentStreak.count++;
            else { 
                currentStreak = { dir: 1, count: 1 }; 
                // Was down, now up. Is it a reversal?
                if (prevC.c < prevC.o && c.c > prevC.o) reversals++;
            }
            if (currentStreak.count > maxStreakUp) maxStreakUp = currentStreak.count;
        } else if (c.c < c.o) {
            if (currentStreak.dir === -1) currentStreak.count++;
            else currentStreak = { dir: -1, count: 1 };
            if (currentStreak.count > maxStreakDown) maxStreakDown = currentStreak.count;
        }
    }

    const avgAtr = totalAtrPct / candles.length;
    const avgBody = totalBodyPct / candles.length;
    const avgWick = totalWickPct / candles.length;
    
    console.log("\n====== HYPE MICRO-STRUCTURE (1H) ======");
    console.log(`Total Candles (Hours): ${candles.length}`);
    console.log(`Avg Hourly Movement (ATR): ${avgAtr.toFixed(2)}%`);
    console.log(`Avg Body Length: ${avgBody.toFixed(2)}%`);
    console.log(`Avg Wick Length: ${avgWick.toFixed(2)}% (Wick to Body ratio: ${(avgWick/avgBody).toFixed(1)}x)`);
    console.log(`Max Consecutive Green Hours: ${maxStreakUp}`);
    console.log(`Max Consecutive Red Hours: ${maxStreakDown}`);
    console.log(`Total Sharp Reversals (V-Bottoms): ${reversals} instances`);

    if (avgWick > avgBody * 1.5) {
        console.log("👉 CHARACTER: [HIGHLY MEAN-REVERTING WICKS] - Strategy should fade extremums.");
    } else {
        console.log("👉 CHARACTER: [TRENDING BODIES] - Strategy should ride breakouts.");
    }

    if (maxStreakUp > 5 && maxStreakDown > 5) {
        console.log("👉 CHARACTER: [MOMENTUM CASCADES] - Pyramiding into trends is extremely profitable.");
    }
}

analyzeHypeCharacter();
