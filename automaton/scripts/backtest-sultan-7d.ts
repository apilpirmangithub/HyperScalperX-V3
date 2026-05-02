import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyzeChameleonWick, type Candle, type TASignal } from "../src/survival/technicals.js";
import * as fs from "fs";

const DAY_SEC = 24 * 60 * 60;

async function fetchCandlesChunked(info: InfoClient, coin: string, startTime: number, endTime: number): Promise<Candle[]> {
    let allCandles: Candle[] = [];
    try {
        const raw = await info.candleSnapshot({ coin, interval: "15m", startTime, endTime }) as any[];
        if (raw && raw.length > 0) {
            allCandles = raw.map(c => ({
                t: c.t, o: parseFloat(c.o), h: parseFloat(c.h), l: parseFloat(c.l),
                c: parseFloat(c.c), v: parseFloat(c.v), n: c.n
            }));
        }
    } catch (e) {
        console.error(`Error fetching ${coin}: ${e}`);
    }
    return allCandles.sort((a,b) => a.t - b.t);
}

async function runBacktest() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    
    // Top assets based on latest scan
    const assets = ["BTC", "ETH", "HYPE", "SOL", "AAVE", "DOGE", "XRP"];
    const days = 7;
    const endTime = Date.now();
    const startTime = endTime - days * DAY_SEC * 1000;
    
    console.log(`📡 Starting Sultan Backtest (7 Days)`);
    console.log(`💰 Starting Balance: $34.00`);
    console.log(`🎯 Strategy: Chameleon Sniper (2.5x ATR TP / 1.0x ATR SL)`);
    console.log(`═══════════════════════════════════════════════════`);

    const assetData: Record<string, Candle[]> = {};
    for (const asset of assets) {
        process.stdout.write(`Fetching ${asset}... `);
        assetData[asset] = await fetchCandlesChunked(info, asset, startTime, endTime);
        console.log(`[${assetData[asset].length} candles]`);
    }

    const allTs = new Set<number>();
    Object.values(assetData).forEach(candles => candles.forEach(c => allTs.add(c.t)));
    const sortedTs = Array.from(allTs).sort((a,b) => a - b);

    let balance = 34.0;
    let peakBalance = 34.0;
    const maxPositions = 1; // Sniper focus
    const marginPct = 0.35; // 35% margin per trade
    const leverage = 10;
    const openPositions: any[] = [];
    const tradeHistory: any[] = [];

    for (const t of sortedTs) {
        // 1. Check exits
        for (let i = openPositions.length - 1; i >= 0; i--) {
            const pos = openPositions[i];
            const candles = assetData[pos.asset];
            const c = candles.find(cand => cand.t === t);
            if (!c) continue;

            let outcome: "TP" | "SL" | null = null;
            if (pos.dir === "LONG") {
                if (c.l <= pos.slPrice) outcome = "SL";
                else if (c.h >= pos.tpPrice) outcome = "TP";
            } else {
                if (c.h <= pos.slPrice) outcome = "SL"; // Wait, short SL is above entry
                if (c.h >= pos.slPrice) outcome = "SL";
                else if (c.l <= pos.tpPrice) outcome = "TP";
            }

            if (outcome) {
                const pnlPct = outcome === "TP" ? pos.tpPct : -pos.slPct;
                const pnlUsdc = (pos.margin * leverage) * (pnlPct / 100);
                balance += pnlUsdc;
                if (balance > peakBalance) peakBalance = balance;

                tradeHistory.push({
                    asset: pos.asset,
                    side: pos.dir,
                    entry: pos.entry,
                    exit: outcome === "TP" ? pos.tpPrice : pos.slPrice,
                    pnlUsdc: pnlUsdc.toFixed(2),
                    pnlPct: pnlPct.toFixed(2) + "%",
                    outcome,
                    balance: balance.toFixed(2)
                });
                openPositions.splice(i, 1);
            }
        }

        // 2. Check entries
        if (openPositions.length < maxPositions) {
            for (const asset of assets) {
                if (openPositions.find(p => p.asset === asset)) continue;
                
                const candles = assetData[asset];
                const idx = candles.findIndex(cand => cand.t === t);
                if (idx < 50) continue; // Need some history

                // Use the exact VPS logic
                const sig = analyzeChameleonWick(candles.slice(0, idx + 1));

                if (sig.direction !== "NEUTRAL") {
                    const candle = candles[idx];
                    const entry = candle.c;
                    const tpPct = sig.tp;
                    const slPct = sig.sl;
                    
                    const margin = balance * marginPct;
                    if (margin < 1) continue;

                    const tpPrice = sig.direction === "LONG" ? entry * (1 + tpPct/100) : entry * (1 - tpPct/100);
                    const slPrice = sig.direction === "LONG" ? entry * (1 - slPct/100) : entry * (1 + slPct/100);

                    openPositions.push({
                        asset,
                        dir: sig.direction,
                        entry,
                        margin,
                        tpPrice,
                        slPrice,
                        tpPct,
                        slPct,
                        startTime: t
                    });
                    break; // Only 1 pos at a time
                }
            }
        }
    }

    console.log(`\n🏆 BACKTEST RESULTS (7 DAYS)`);
    console.log(`═══════════════════════════════════════════════════`);
    console.log(`Initial Balance: $34.00`);
    console.log(`Final Balance:   $${balance.toFixed(2)}`);
    console.log(`Net Profit:      $${(balance - 34).toFixed(2)} (${((balance - 34) / 34 * 100).toFixed(2)}%)`);
    console.log(`Total Trades:    ${tradeHistory.length}`);
    
    if (tradeHistory.length > 0) {
        const wins = tradeHistory.filter(t => t.outcome === "TP").length;
        console.log(`Win Rate:        ${((wins / tradeHistory.length) * 100).toFixed(1)}% (${wins}W / ${tradeHistory.length - wins}L)`);
        console.log(`Peak Balance:    $${peakBalance.toFixed(2)}`);
        
        console.log(`\n📋 RECENT TRADES:`);
        console.table(tradeHistory.slice(-10));
    } else {
        console.log(`No trades executed in this period.`);
    }
}

runBacktest().catch(console.error);
