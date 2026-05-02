import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyzeChameleonWick, type Candle } from "../src/survival/technicals.js";
import * as fs from "fs";

const DAY_SEC = 24 * 60 * 60;

async function fetchCandles(info: InfoClient, coin: string, startTime: number, endTime: number): Promise<Candle[]> {
    let allCandles: Candle[] = [];
    try {
        // Fetching in chunks to avoid API limits for a whole month
        let currentStart = startTime;
        while (currentStart < endTime) {
            const chunkEnd = Math.min(currentStart + (7 * DAY_SEC * 1000), endTime);
            const raw = await info.candleSnapshot({ coin, interval: "15m", startTime: currentStart, endTime: chunkEnd }) as any[];
            if (raw && raw.length > 0) {
                allCandles = allCandles.concat(raw.map(c => ({
                    t: c.t, o: parseFloat(c.o), h: parseFloat(c.h), l: parseFloat(c.l),
                    c: parseFloat(c.c), v: parseFloat(c.v), n: c.n
                })));
            }
            currentStart = chunkEnd + 1;
            await new Promise(r => setTimeout(r, 100)); // Rate limit safety
        }
    } catch (e) {
        console.error(`Error fetching ${coin}: ${e}`);
    }
    const unique = new Map();
    allCandles.forEach(c => unique.set(c.t, c));
    return Array.from(unique.values()).sort((a,b) => a.t - b.t);
}

async function runDeepBacktest() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    
    // Comprehensive Top Asset Pool
    const assets = ["BTC", "ETH", "HYPE", "SOL", "AAVE", "DOGE", "XRP", "NEAR", "TIA", "SEI", "WLD", "AVAX", "OP", "ARB"];
    const startTime = new Date("2026-04-01T00:00:00Z").getTime();
    const endTime = Date.now();
    
    console.log(`🚀 STARTING DEEP BACKTEST: APRIL 2026`);
    console.log(`💰 Initial Capital: $34.00`);
    console.log(`🦎 Strategy: Chameleon Sniper V3 (2.5% TP / 1.0% SL)`);
    console.log(`📊 Mode: Sequential Sniper (Max 1 Pos)`);
    console.log(`═══════════════════════════════════════════════════`);

    const assetData: Record<string, Candle[]> = {};
    for (const asset of assets) {
        process.stdout.write(`Downloading ${asset} history... `);
        assetData[asset] = await fetchCandles(info, asset, startTime, endTime);
        console.log(`[${assetData[asset].length} intervals]`);
    }

    // Get all unique timestamps across all assets
    const allTs = new Set<number>();
    Object.values(assetData).forEach(candles => candles.forEach(c => allTs.add(c.t)));
    const sortedTs = Array.from(allTs).sort((a,b) => a - b);

    let balance = 34.0;
    let peakBalance = 34.0;
    let maxDrawdown = 0;
    
    const marginPct = 0.35; 
    const leverage = 10;
    let currentPosition: any = null;
    const tradeHistory: any[] = [];

    for (const t of sortedTs) {
        // 1. If in position, check for exit first
        if (currentPosition) {
            const candles = assetData[currentPosition.asset];
            const candle = candles.find(c => c.t === t);
            if (candle) {
                let exitPrice = 0;
                let outcome: "TP" | "SL" | null = null;

                if (currentPosition.side === "LONG") {
                    if (candle.l <= currentPosition.slPrice) {
                        outcome = "SL";
                        exitPrice = currentPosition.slPrice;
                    } else if (candle.h >= currentPosition.tpPrice) {
                        outcome = "TP";
                        exitPrice = currentPosition.tpPrice;
                    }
                } else {
                    if (candle.h >= currentPosition.slPrice) {
                        outcome = "SL";
                        exitPrice = currentPosition.slPrice;
                    } else if (candle.l <= currentPosition.tpPrice) {
                        outcome = "TP";
                        exitPrice = currentPosition.tpPrice;
                    }
                }

                if (outcome) {
                    const pnlPct = outcome === "TP" ? 2.5 : -1.0;
                    const pnlUsdc = (currentPosition.margin * leverage) * (pnlPct / 100);
                    balance += pnlUsdc;
                    
                    if (balance > peakBalance) peakBalance = balance;
                    const dd = ((peakBalance - balance) / peakBalance) * 100;
                    if (dd > maxDrawdown) maxDrawdown = dd;

                    tradeHistory.push({
                        time: new Date(t).toISOString().replace("T", " ").split(".")[0],
                        asset: currentPosition.asset,
                        side: currentPosition.side,
                        entry: currentPosition.entryPrice.toFixed(4),
                        exit: exitPrice.toFixed(4),
                        outcome,
                        pnl: pnlUsdc.toFixed(2),
                        balance: balance.toFixed(2)
                    });
                    currentPosition = null;
                }
            }
        }

        // 2. If NOT in position, scan for entries
        if (!currentPosition) {
            const candidates: any[] = [];
            for (const asset of assets) {
                const candles = assetData[asset];
                const idx = candles.findIndex(c => c.t === t);
                if (idx < 50) continue;

                const slice = candles.slice(0, idx + 1);
                const sig = analyzeChameleonWick(slice);

                if (sig.direction !== "NEUTRAL") {
                    candidates.push({ 
                        asset, 
                        direction: sig.direction, 
                        signal: sig, 
                        entryPrice: candles[idx].c,
                        // Score based on extremity: High Z-Score and High Volume
                        score: Math.abs(sig.zScore || 0) * (sig.volSurge || 1)
                    });
                }
            }

            if (candidates.length > 0) {
                // Pick the candidate with the highest extremity score
                const best = candidates.sort((a, b) => b.score - a.score)[0];
                const margin = balance * marginPct;
                
                if (margin >= 1) {
                    currentPosition = {
                        asset: best.asset,
                        side: best.direction,
                        entryPrice: best.entryPrice,
                        margin,
                        tpPrice: best.direction === "LONG" ? best.entryPrice * 1.025 : best.entryPrice * 0.975,
                        slPrice: best.direction === "LONG" ? best.entryPrice * 0.990 : best.entryPrice * 1.010,
                        startTime: t
                    };
                }
            }
        }

    }

    console.log(`\n🏆 FINAL PERFORMANCE REPORT: APRIL 2026`);
    console.log(`═══════════════════════════════════════════════════`);
    console.log(`Final Balance:   $${balance.toFixed(2)}`);
    console.log(`Total Profit:    $${(balance - 34).toFixed(2)} (${((balance - 34) / 34 * 100).toFixed(2)}%)`);
    console.log(`Total Trades:    ${tradeHistory.length}`);
    
    if (tradeHistory.length > 0) {
        const wins = tradeHistory.filter(t => t.outcome === "TP").length;
        const losses = tradeHistory.length - wins;
        console.log(`Win Rate:        ${((wins / tradeHistory.length) * 100).toFixed(1)}% (${wins}W - ${losses}L)`);
        console.log(`Peak Balance:    $${peakBalance.toFixed(2)}`);
        console.log(`Max Drawdown:    ${maxDrawdown.toFixed(2)}%`);
        
        console.log(`\n📋 FULL TRADE LOG (Sultan Snipe):`);
        console.table(tradeHistory);
    } else {
        console.log(`No signals triggered in the entire month of April.`);
    }
}

runDeepBacktest().catch(console.error);
