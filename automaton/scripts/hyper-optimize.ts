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

async function simulate(assetData: any, zThreshold: number, trailingStart: number, trailingCallback: number) {
    const assets = Object.keys(assetData);
    const allTs = new Set<number>();
    assets.forEach(a => assetData[a].forEach((c: any) => allTs.add(c.t)));
    const sortedTs = Array.from(allTs).sort((a,b) => a - b);

    let balance = 34.0;
    const marginPct = 0.40;
    const leverage = 10;
    let currentPosition: any = null;
    let tradeCount = 0;
    const cooldowns: Record<string, number> = {};

    for (const t of sortedTs) {
        if (currentPosition) {
            const candle = assetData[currentPosition.asset].find((c: any) => c.t === t);
            if (candle) {
                let pnlPct = 0;
                let closed = false;

                const high = candle.h;
                const low = candle.l;
                const entry = currentPosition.entryPrice;

                if (currentPosition.side === "LONG") {
                    const currentMaxPnL = ((high - entry) / entry) * 100;
                    const currentMinPnL = ((low - entry) / entry) * 100;
                    
                    if (currentMinPnL <= -1.0) { // SL
                        pnlPct = -1.0; closed = true;
                    } else {
                        currentPosition.peakPnL = Math.max(currentPosition.peakPnL, currentMaxPnL);
                        if (currentPosition.peakPnL >= trailingStart) {
                            if (currentMaxPnL < currentPosition.peakPnL - trailingCallback) {
                                pnlPct = currentPosition.peakPnL - trailingCallback; closed = true;
                            }
                        }
                    }
                } else {
                    const currentMaxPnL = ((entry - low) / entry) * 100;
                    const currentMinPnL = ((entry - high) / entry) * 100;

                    if (currentMinPnL <= -1.0) { // SL
                        pnlPct = -1.0; closed = true;
                    } else {
                        currentPosition.peakPnL = Math.max(currentPosition.peakPnL, currentMaxPnL);
                        if (currentPosition.peakPnL >= trailingStart) {
                            if (currentMaxPnL < currentPosition.peakPnL - trailingCallback) {
                                pnlPct = currentPosition.peakPnL - trailingCallback; closed = true;
                            }
                        }
                    }
                }

                if (closed) {
                    balance += (currentPosition.margin * leverage) * (pnlPct / 100);
                    cooldowns[currentPosition.asset] = t + (30 * 60 * 1000);
                    currentPosition = null;
                    tradeCount++;
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

                const slice = candles.slice(0, idx + 1);
                const current = slice[slice.length - 1];
                const closes = slice.map((c: any) => c.c);
                
                // Custom Math for Optimization
                const mean = closes.slice(-20).reduce((a: any, b: any) => a + b, 0) / 20;
                const variance = closes.slice(-20).reduce((a: any, b: any) => a + Math.pow(b - mean, 2), 0) / 20;
                const stdDev = Math.sqrt(variance);
                const currentZ = (current.c - mean) / stdDev;

                if (Math.abs(currentZ) >= zThreshold) {
                    candidates.push({ asset, direction: currentZ < 0 ? "LONG" : "SHORT", zScore: currentZ, entryPrice: current.c });
                }
            }
            if (candidates.length > 0) {
                const best = candidates.sort((a,b) => Math.abs(b.zScore) - Math.abs(a.zScore))[0];
                currentPosition = { ...best, margin: balance * marginPct, peakPnL: 0 };
            }
        }
    }
    return { balance, tradeCount };
}

async function optimize() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    const assets = ["BTC", "ETH", "HYPE", "SOL", "AAVE", "DOGE", "XRP", "NEAR", "AVAX", "WLD"];
    const endTime = Date.now();
    const startTime = endTime - (20 * DAY_SEC * 1000);
    
    const assetData: any = {};
    for (const asset of assets) {
        assetData[asset] = await fetchCandles(info, asset, startTime, endTime);
    }

    console.log("🚀 STARTING HYPER-OPTIMIZATION...");
    let bestResult = { balance: 0, z: 0, tStart: 0, tCall: 0 };

    for (let z = 3.0; z <= 3.8; z += 0.2) {
        for (let tS = 1.5; tS <= 3.5; tS += 0.5) {
            for (let tC = 0.3; tC <= 0.8; tC += 0.2) {
                const res = await simulate(assetData, z, tS, tC);
                if (res.balance > bestResult.balance) {
                    bestResult = { balance: res.balance, z, tStart: tS, tCall: tC };
                }
            }
        }
    }

    console.log("\n💎 OPTIMIZATION FOUND!");
    console.log(`Best Balance: $${bestResult.balance.toFixed(2)}`);
    console.log(`Settings: Z-Score ${bestResult.z.toFixed(1)} | Trailing Start ${bestResult.tStart.toFixed(1)}% | Callback ${bestResult.tCall.toFixed(1)}%`);
}

optimize().catch(console.error);
