import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyzeChameleonWick, type Candle } from "../src/survival/technicals.js";

const DAY_SEC = 24 * 60 * 60;

async function fetchCandles(info: InfoClient, coin: string, startTime: number, endTime: number): Promise<Candle[]> {
    let allCandles: Candle[] = [];
    try {
        let currentStart = startTime;
        while (currentStart < endTime) {
            const chunkEnd = Math.min(currentStart + (5 * DAY_SEC * 1000), endTime);
            const raw = await info.candleSnapshot({ coin, interval: "15m", startTime: currentStart, endTime: chunkEnd }) as any[];
            if (raw && raw.length > 0) {
                allCandles = allCandles.concat(raw.map(c => ({
                    t: c.t, o: parseFloat(c.o), h: parseFloat(c.h), l: parseFloat(c.l),
                    c: parseFloat(c.c), v: parseFloat(c.v), n: c.n
                })));
            }
            currentStart = chunkEnd + 1;
            await new Promise(r => setTimeout(r, 50)); 
        }
    } catch (e) {
        console.error(`Error fetching ${coin}: ${e}`);
    }
    const unique = new Map();
    allCandles.forEach(c => unique.set(c.t, c));
    return Array.from(unique.values()).sort((a,b) => a.t - b.t);
}

async function runUltimateBacktest() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    
    const assets = ["BTC", "ETH", "HYPE", "SOL", "AAVE", "DOGE", "XRP", "NEAR", "TIA", "SEI", "WLD", "AVAX", "OP", "ARB", "FET"];
    const endTime = Date.now();
    const startTime = endTime - (20 * DAY_SEC * 1000);
    
    console.log(`💎 ULTIMATE 20-DAY DEEP SCAN (Best Signal + Compounding)`);
    console.log(`📅 Range: ${new Date(startTime).toLocaleDateString()} - ${new Date(endTime).toLocaleDateString()}`);
    console.log(`═══════════════════════════════════════════════════`);

    const assetData: Record<string, Candle[]> = {};
    for (const asset of assets) {
        process.stdout.write(`Syncing ${asset}... `);
        assetData[asset] = await fetchCandles(info, asset, startTime, endTime);
        console.log(`Done (${assetData[asset].length} intervals)`);
    }

    const allTs = new Set<number>();
    Object.values(assetData).forEach(candles => candles.forEach(c => allTs.add(c.t)));
    const sortedTs = Array.from(allTs).sort((a,b) => a - b);

    let balance = 34.0;
    let peakBalance = 34.0;
    let maxDrawdown = 0;
    const marginPct = 0.40;
    const leverage = 10;
    let currentPosition: any = null;
    const tradeHistory: any[] = [];
    const cooldowns: Record<string, number> = {};

    for (const t of sortedTs) {
        // 1. MONITOR OPEN POSITION
        if (currentPosition) {
            const candles = assetData[currentPosition.asset];
            const candle = candles.find(c => c.t === t);
            if (candle) {
                let outcome: "TP" | "SL" | null = null;
                let exitPrice = 0;

                if (currentPosition.side === "LONG") {
                    if (candle.l <= currentPosition.slPrice) { outcome = "SL"; exitPrice = currentPosition.slPrice; }
                    else if (candle.h >= currentPosition.tpPrice) { outcome = "TP"; exitPrice = currentPosition.tpPrice; }
                } else {
                    if (candle.h >= currentPosition.slPrice) { outcome = "SL"; exitPrice = currentPosition.slPrice; }
                    else if (candle.l <= currentPosition.tpPrice) { outcome = "TP"; exitPrice = currentPosition.tpPrice; }
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
                        balance: balance.toFixed(2),
                        zScore: currentPosition.zScore.toFixed(2),
                        volSurge: currentPosition.volSurge.toFixed(2)
                    });
                    
                    cooldowns[currentPosition.asset] = t + (30 * 60 * 1000); // 30 min cooldown
                    currentPosition = null;
                }
            }
        }

        // 2. SCAN FOR BEST SIGNAL
        if (!currentPosition) {
            const candidates: any[] = [];
            for (const asset of assets) {
                if (cooldowns[asset] && t < cooldowns[asset]) continue;

                const candles = assetData[asset];
                const idx = candles.findIndex(c => c.t === t);
                if (idx < 50) continue;

                const slice = candles.slice(0, idx + 1);
                const sig = analyzeChameleonWick(slice);

                if (sig.direction !== "NEUTRAL") {
                    candidates.push({ 
                        asset, 
                        direction: sig.direction, 
                        zScore: sig.zScore, 
                        volSurge: sig.volSurge, 
                        entryPrice: candles[idx].c,
                        score: Math.abs(sig.zScore) * sig.volSurge
                    });
                }
            }

            if (candidates.length > 0) {
                const best = candidates.sort((a,b) => b.score - a.score)[0];
                const margin = balance * marginPct;
                if (margin > 1) {
                    currentPosition = {
                        asset: best.asset,
                        side: best.direction,
                        entryPrice: best.entryPrice,
                        zScore: best.zScore,
                        volSurge: best.volSurge,
                        margin,
                        tpPrice: best.direction === "LONG" ? best.entryPrice * 1.025 : best.entryPrice * 0.975,
                        slPrice: best.direction === "LONG" ? best.entryPrice * 0.990 : best.entryPrice * 1.010,
                    };
                }
            }
        }
    }

    console.log(`\n📊 ULTIMATE REPORT (20 DAYS)`);
    console.log(`═══════════════════════════════════════════════════`);
    console.log(`Final Balance:   $${balance.toFixed(2)}`);
    console.log(`PnL:             $${(balance - 34).toFixed(2)} (${((balance-34)/34*100).toFixed(2)}%)`);
    console.log(`Total Trades:    ${tradeHistory.length}`);
    
    if (tradeHistory.length > 0) {
        const wins = tradeHistory.filter(t => t.outcome === "TP").length;
        console.log(`Win Rate:        ${((wins/tradeHistory.length)*100).toFixed(1)}% (${wins}W - ${tradeHistory.length - wins}L)`);
        console.log(`Max Drawdown:    ${maxDrawdown.toFixed(2)}%`);
        console.log(`\n📋 TOP TRADE LOGS (Mathematical Audit):`);
        console.table(tradeHistory.slice(-20)); 
    }
}

runUltimateBacktest().catch(console.error);
