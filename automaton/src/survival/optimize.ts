/**
 * HYPE Config #5 — Extended 2-Week Historical Validation
 * Testing multiple 2-week windows going back in time
 */
import { getCandles } from "./hyperliquid.js";
import { analyze, type Candle, TAConfig } from "./technicals.js";

function limitOrderBacktest(candles: Candle[], initial: number = 8): { trades: number; wins: number; balance: number; pnl: number } | null {
    if (candles.length < 200) return null;
    const conf = 20, risk = 0.9, tpMulti = 2.5, slMulti = 0.5, lev = 20;
    const MAKER_REBATE = 0.0002;
    const config: TAConfig = { scoreThreshold: 10, volumeSurgeThreshold: 0.5, vaPenalty: 1.0 };
    let balance = initial;
    let position: { side: "LONG" | "SHORT"; entry: number; sl: number; tp: number; pendingLimit: boolean; limitPrice: number; startI: number } | null = null;
    let trades = 0, wins = 0;

    for (let i = 200; i < candles.length; i++) {
        const c = candles[i];
        if (position && position.pendingLimit) {
            let filled = false;
            if (position.side === "LONG" && c.l <= position.limitPrice) { position.entry = position.limitPrice; position.pendingLimit = false; filled = true; }
            else if (position.side === "SHORT" && c.h >= position.limitPrice) { position.entry = position.limitPrice; position.pendingLimit = false; filled = true; }
            if (!filled && (i - position.startI > 6)) { position = null; continue; }
            if (filled) balance += balance * risk * MAKER_REBATE;
            if (!filled) continue;
        }
        if (position && !position.pendingLimit) {
            let exited = false, pnl = 0;
            const posSize = balance * risk * lev;
            if (position.side === "LONG") {
                if (c.l <= position.sl) { pnl = (position.sl - position.entry) / position.entry * posSize; exited = true; }
                else if (c.h >= position.tp) { pnl = (position.tp - position.entry) / position.entry * posSize; exited = true; }
            } else {
                if (c.h >= position.sl) { pnl = (position.entry - position.sl) / position.entry * posSize; exited = true; }
                else if (c.l <= position.tp) { pnl = (position.entry - position.tp) / position.entry * posSize; exited = true; }
            }
            if (exited) {
                balance += balance * risk * MAKER_REBATE;
                balance += pnl; trades++;
                if (pnl > 0) wins++;
                position = null;
            }
            continue;
        }
        if (!position && balance > 0.5) {
            const history = candles.slice(i - 200, i + 1);
            const signal = analyze(history, 0, config);
            if (signal.direction !== "NEUTRAL" && signal.confidence >= conf) {
                const slPct = signal.dynamicSL * slMulti / 100;
                const tpPct = signal.dynamicTP * tpMulti / 100;
                const limitOffset = 0.0005;
                const limitPrice = signal.direction === "LONG" ? c.c * (1 - limitOffset) : c.c * (1 + limitOffset);
                position = {
                    side: signal.direction as "LONG" | "SHORT", entry: 0, limitPrice, pendingLimit: true, startI: i,
                    sl: signal.direction === "LONG" ? limitPrice * (1 - slPct) : limitPrice * (1 + slPct),
                    tp: signal.direction === "LONG" ? limitPrice * (1 + tpPct) : limitPrice * (1 - tpPct),
                };
            }
        }
    }
    return { trades, wins, balance, pnl: ((balance - initial) / initial) * 100 };
}

async function main() {
    console.log("=== HYPE Config #5 — Extended 2-Week Historical Test ===\n");
    const days = 14;
    const candlesNeeded = Math.floor((days * 24 * 60) / 5);

    const tests = [
        { label: "2W #1: Now → 14d ago", offset: 0 },
        { label: "2W #2: 14d → 28d ago", offset: 14 },
        { label: "2W #3: 28d → 42d ago", offset: 28 },
        { label: "2W #4: 42d → 56d ago", offset: 42 },
        { label: "2W #5: 56d → 70d ago", offset: 56 },
    ];

    console.log("Config: Conf20 | Risk90% | TP x2.5 | SL x0.5 | 20x Lev | 5m TF\n");

    for (const test of tests) {
        const endTime = Date.now() - (test.offset * 86400000);
        const startDate = new Date(endTime - days * 86400000).toISOString().slice(0, 10);
        const endDate = new Date(endTime).toISOString().slice(0, 10);

        console.log(`📡 ${test.label} (${startDate} → ${endDate})...`);
        const candles = await getCandles("HYPE", "5m", candlesNeeded, endTime);
        console.log(`   Candles: ${candles.length}`);

        const result = limitOrderBacktest(candles);
        if (result) {
            const wr = result.trades > 0 ? ((result.wins / result.trades) * 100).toFixed(0) : '0';
            const emoji = result.pnl > 100 ? '🔥🔥' : result.pnl > 0 ? '✅' : result.pnl > -30 ? '⚠️' : '🩸';
            console.log(`   ${emoji} $8 → $${result.balance.toFixed(2)} | PnL: ${result.pnl >= 0 ? '+' : ''}${result.pnl.toFixed(1)}% | ${result.trades}T | WR ${wr}%`);
        } else {
            console.log(`   ❌ Not enough data`);
        }
        console.log();
        await new Promise(r => setTimeout(r, 1500));
    }
}

main().catch(console.error);
