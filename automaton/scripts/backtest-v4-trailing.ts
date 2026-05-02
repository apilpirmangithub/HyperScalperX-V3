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
            await new Promise(r => setTimeout(r, 20)); 
        }
    } catch (e) { }
    const unique = new Map();
    allCandles.forEach(c => unique.set(c.t, c));
    return Array.from(unique.values()).sort((a,b) => a.t - b.t);
}

async function runV4Backtest() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    const assets = ["BTC", "ETH", "HYPE", "SOL", "AAVE", "DOGE", "XRP", "NEAR", "AVAX", "WLD", "SEI", "OP", "ARB"];
    const endTime = Date.now();
    const startTime = endTime - (20 * DAY_SEC * 1000);
    
    const assetData: any = {};
    for (const asset of assets) {
        process.stdout.write(`Syncing ${asset}... `);
        assetData[asset] = await fetchCandles(info, asset, startTime, endTime);
        console.log("OK");
    }

    const allTs = new Set<number>();
    Object.values(assetData).forEach((candles: any) => candles.forEach((c: any) => allTs.add(c.t)));
    const sortedTs = Array.from(allTs).sort((a: any,b: any) => a - b);

    let balance = 34.0;
    let peakBalance = 34.0;
    const marginPct = 0.40;
    const leverage = 10;
    const trailingStart = 2.0;
    const callback = 0.5;
    
    let currentPosition: any = null;
    const tradeHistory: any[] = [];
    const cooldowns: Record<string, number> = {};

    for (const t of sortedTs) {
        if (currentPosition) {
            const candle = assetData[currentPosition.asset].find((c: any) => c.t === t);
            if (candle) {
                let closed = false;
                let pnlPct = 0;
                let exitPrice = 0;

                const entry = currentPosition.entryPrice;
                const isLong = currentPosition.side === "LONG";
                const high = candle.h;
                const low = candle.l;

                // Precision Monitoring (Checking SL first for safety)
                const minPnL = isLong ? ((low - entry) / entry) * 100 : ((entry - high) / entry) * 100;
                const maxPnL = isLong ? ((high - entry) / entry) * 100 : ((entry - low) / entry) * 100;

                if (minPnL <= -1.0) {
                    pnlPct = -1.0;
                    exitPrice = isLong ? entry * 0.99 : entry * 1.01;
                    closed = true;
                } else {
                    currentPosition.peak = Math.max(currentPosition.peak || 0, maxPnL);
                    if (currentPosition.peak >= trailingStart) {
                        if (maxPnL < currentPosition.peak - callback) {
                            pnlPct = currentPosition.peak - callback;
                            exitPrice = isLong ? entry * (1 + pnlPct/100) : entry * (1 - pnlPct/100);
                            closed = true;
                        }
                    }
                }

                if (closed) {
                    const pnlUsdc = (currentPosition.margin * leverage) * (pnlPct / 100);
                    balance += pnlUsdc;
                    tradeHistory.push({
                        time: new Date(t).toISOString().replace("T", " ").split(".")[0],
                        asset: currentPosition.asset,
                        side: currentPosition.side,
                        pnl: pnlUsdc.toFixed(2),
                        pnlPct: pnlPct.toFixed(2) + "%",
                        balance: balance.toFixed(2),
                        peak: currentPosition.peak.toFixed(2) + "%"
                    });
                    cooldowns[currentPosition.asset] = t + (30 * 60 * 1000);
                    currentPosition = null;
                }
            }
        }

        if (!currentPosition && balance > 1) {
            const candidates: any[] = [];
            for (const asset of assets) {
                if (cooldowns[asset] && t < cooldowns[asset]) continue;
                const candles = assetData[asset];
                const idx = candles.findIndex((c: any) => c.t === t);
                if (idx < 50) continue;

                const sig = analyzeChameleonWick(candles.slice(0, idx + 1));
                if (sig.direction !== "NEUTRAL") {
                    candidates.push({ asset, direction: sig.direction, z: sig.zScore, v: sig.volSurge, entry: candles[idx].c });
                }
            }
            if (candidates.length > 0) {
                const best = candidates.sort((a,b) => (Math.abs(b.z) * b.v) - (Math.abs(a.z) * a.v))[0];
                currentPosition = {
                    asset: best.asset,
                    side: best.direction,
                    entryPrice: best.entry,
                    margin: balance * marginPct,
                    peak: 0
                };
            }
        }
    }

    console.log(`\n🏆 V4 TRAILING BACKTEST RESULTS (20 DAYS)`);
    console.log(`═══════════════════════════════════════════════════`);
    console.log(`Final Balance:   $${balance.toFixed(2)}`);
    console.log(`Profit:          $${(balance - 34).toFixed(2)} (${((balance-34)/34*100).toFixed(2)}%)`);
    console.log(`Total Trades:    ${tradeHistory.length}`);
    
    if (tradeHistory.length > 0) {
        const wins = tradeHistory.filter(t => parseFloat(t.pnlPct) > 0).length;
        console.log(`Win Rate:        ${((wins/tradeHistory.length)*100).toFixed(1)}%`);
        console.table(tradeHistory.slice(-15));
    }
}

runV4Backtest().catch(console.error);
