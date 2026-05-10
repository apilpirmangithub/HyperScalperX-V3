import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyzeChameleonWick, type Candle, setStrategyConfig } from "../src/survival/technicals.js";
import * as fs from "fs";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const END_TIME = Date.now();
const START_TIME = END_TIME - (60 * DAY_MS); // 60 Days

async function fetchCandles(info: InfoClient, coin: string, startTime: number, endTime: number, interval: "15m" | "1m"): Promise<Candle[]> {
    let currentStart = startTime;
    let allCandles: Candle[] = [];
    while (currentStart < endTime) {
        const chunkEnd = Math.min(currentStart + (interval === "1m" ? 12 * 60 * 60 * 1000 : 15 * DAY_MS), endTime);
        try {
            const raw = await info.candleSnapshot({ coin, interval, startTime: currentStart, endTime: chunkEnd }) as any[];
            if (raw && raw.length > 0) {
                allCandles = allCandles.concat(raw.map(c => ({
                    t: c.t, o: parseFloat(c.o), h: parseFloat(c.h), l: parseFloat(c.l),
                    c: parseFloat(c.c), v: parseFloat(c.v), n: c.n
                })));
            }
            await new Promise(r => setTimeout(r, 50)); 
        } catch (e) { break; }
        currentStart = chunkEnd;
    }
    return allCandles.sort((a,b) => a.t - b.t);
}

async function run60DayBacktest(params: any) {
    const { z, sl, ts, wk } = params;
    setStrategyConfig({ zThreshold: z, sl: sl, wickThreshold: wk });
    
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    const assets = ["SOL", "ETH", "BTC", "NEAR", "AVAX", "OP", "ARB", "LINK", "AAVE", "LTC"];
    
    console.log(`\n🕵️ 60-Day High-Fidelity Audit: Z=${z} SL=${sl}% Trail=${ts}% Wick=${wk}`);
    
    // Structure to hold balance over time
    let balance = 20.0;
    const initialBalance = balance;
    
    const weeklyData: Record<number, number> = {};
    for (let i = 1; i <= 9; i++) {
        const weekTs = START_TIME + (i * WEEK_MS);
        weeklyData[weekTs] = 0;
    }

    const tradeHistory: any[] = [];
    
    for (const asset of assets) {
        console.log(`📊 Fetching data for ${asset}...`);
        const candles15m = await fetchCandles(info, asset, START_TIME - (DAY_MS * 2), END_TIME, "15m");
        const candles1m = await fetchCandles(info, asset, START_TIME, END_TIME, "1m");
        
        let activePos: any = null;

        for (let i = 100; i < candles15m.length; i++) {
            const c15 = candles15m[i];
            if (c15.t < START_TIME) continue;

            if (!activePos) {
                const sig = analyzeChameleonWick(candles15m.slice(0, i + 1));
                if (sig.direction !== "NEUTRAL") {
                    activePos = {
                        asset,
                        dir: sig.direction,
                        entry: sig.direction === "LONG" ? c15.c * 1.0002 : c15.c * 0.9998,
                        size: ((balance - 0.5) * 0.4 * 0.95 * 20) / c15.c,
                        peak: 0
                    };
                }
            } else if (activePos.asset === asset) {
                // Find all 1m candles within this 15m window
                const minuteCandles = candles1m.filter(m => m.t >= c15.t && m.t < c15.t + 900000);
                
                for (const m of minuteCandles) {
                    const isLong = activePos.dir === "LONG";
                    const pnlPct = ((m.c - activePos.entry) / activePos.entry * 100) * (isLong ? 1 : -1);
                    if (pnlPct > activePos.peak) activePos.peak = pnlPct;

                    let exit = "";
                    const slPrice = isLong ? activePos.entry * (1 - sl/100) : activePos.entry * (1 + sl/100);
                    
                    if (isLong ? m.l <= slPrice : m.h >= slPrice) exit = "SL";
                    else if (activePos.peak >= ts && pnlPct <= activePos.peak - 0.5) exit = "TP";

                    if (exit) {
                        const exitPrice = exit === "SL" ? slPrice : (isLong ? m.c * 0.9998 : m.c * 1.0002);
                        const netPnl = activePos.size * (exitPrice - activePos.entry) * (isLong ? 1 : -1);
                        const fee = (activePos.size * activePos.entry + activePos.size * exitPrice) * 0.0004;
                        const finalTradePnl = netPnl - fee;
                        balance += finalTradePnl;
                        tradeHistory.push({ t: m.t, pnl: finalTradePnl, asset, dir: activePos.dir });
                        console.log(`  [TRADE] ${asset} ${activePos.dir} closed via ${exit} | PnL: $${finalTradePnl.toFixed(2)}`);
                        activePos = null;
                        break;
                    }
                }
            }
        }
    }

    // Sort trade history to calculate weekly balance
    tradeHistory.sort((a,b) => a.t - b.t);
    
    console.log("\n📈 60-DAY PERFORMANCE REPORT (WEEKLY)");
    console.log("======================================");
    
    let currentBalance = initialBalance;
    let weekIndex = 1;
    let nextWeekTs = START_TIME + WEEK_MS;
    
    console.log(`Week 0: $${currentBalance.toFixed(2)} (Start)`);
    
    for (const trade of tradeHistory) {
        while (trade.t > nextWeekTs && nextWeekTs <= END_TIME) {
            console.log(`Week ${weekIndex}: $${currentBalance.toFixed(2)}`);
            weekIndex++;
            nextWeekTs += WEEK_MS;
        }
        currentBalance += trade.pnl;
    }
    
    // Fill remaining weeks
    while (nextWeekTs <= END_TIME + WEEK_MS && weekIndex <= 9) {
        console.log(`Week ${weekIndex}: $${currentBalance.toFixed(2)}`);
        weekIndex++;
        nextWeekTs += WEEK_MS;
    }

    console.log("======================================");
    console.log(`FINAL ROI: ${(((currentBalance - initialBalance)/initialBalance)*100).toFixed(2)}%`);
}

run60DayBacktest({ z: 3.2, sl: 1.0, ts: 0.8, wk: 0.02 });
