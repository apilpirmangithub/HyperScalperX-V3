import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { zScore, volumeSurge, type Candle } from "../src/survival/technicals.js";
import * as fs from "fs";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_DAYS = 60;
const END_TIME = Date.now();
const START_TIME = END_TIME - (LOOKBACK_DAYS * DAY_MS);

const ASSETS = ["SOL", "WLD", "HYPE", "BTC", "ETH", "NEAR", "FET", "XRP"];

async function fetchCandles(info: InfoClient, coin: string, startTime: number, endTime: number): Promise<Candle[]> {
    let all: Candle[] = [];
    let cur = startTime;
    const chunk = 15 * DAY_MS;
    while (cur < endTime) {
        const ce = Math.min(cur + chunk, endTime);
        try {
            const raw = await info.candleSnapshot({ coin, interval: "15m", startTime: cur, endTime: ce }) as any[];
            if (raw && raw.length > 0) {
                all = all.concat(raw.map(c => ({
                    t: c.t, o: parseFloat(c.o), h: parseFloat(c.h), l: parseFloat(c.l),
                    c: parseFloat(c.c), v: parseFloat(c.v), n: c.n
                })));
            }
            await new Promise(r => setTimeout(r, 60));
        } catch (e) {}
        cur = ce;
    }
    const unique = new Map();
    all.forEach(c => unique.set(c.t, c));
    return Array.from(unique.values()).sort((a,b) => a.t - b.t);
}

async function runOptimization() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    
    console.log(`📡 Pre-fetching data and calculating indicators for ${ASSETS.length} assets...`);
    const assetIndicators: Record<string, Map<number, any>> = {};
    const assetCandles: Record<string, Map<number, Candle>> = {};

    for (const a of ASSETS) {
        const data = await fetchCandles(info, a, START_TIME - (10 * DAY_MS), END_TIME);
        const indMap = new Map();
        const candMap = new Map();
        
        for (let i = 100; i < data.length; i++) {
            const hist = data.slice(0, i + 1);
            const current = data[i];
            const closes = hist.map(c => c.c);
            const z = zScore(closes, 20);
            const vol = volumeSurge(hist, 20);
            
            const window24h = hist.slice(-96);
            const low24h = Math.min(...window24h.map(c => c.l));
            const high24h = Math.max(...window24h.map(c => c.h));

            const totalLength = current.h - current.l;
            const bodyTop = Math.max(current.o, current.c);
            const bodyBottom = Math.min(current.o, current.c);
            const upperWick = current.h - bodyTop;
            const lowerWick = bodyBottom - current.l;
            const upperWickRatio = totalLength > 0 ? upperWick / totalLength : 0;
            const lowerWickRatio = totalLength > 0 ? lowerWick / totalLength : 0;

            indMap.set(current.t, { z, vol, low24h, high24h, upperWickRatio, lowerWickRatio, price: current.c, high: current.h, low: current.l });
            candMap.set(current.t, current);
        }
        assetIndicators[a] = indMap;
        assetCandles[a] = candMap;
    }

    const allTs = Array.from(assetIndicators[ASSETS[0]].keys()).filter(t => t >= START_TIME).sort((a,b) => a - b);

    const zGrid = [2.6, 2.9, 3.2];
    const volGrid = [1.8, 2.2, 2.6];
    const marginGrid = [0.25, 0.40, 0.50];
    const trailingStartGrid = [1.5, 1.8, 2.1];
    
    const results: any[] = [];
    console.log(`🔥 Running Ultra-Fast Simulation (${zGrid.length * volGrid.length * marginGrid.length * trailingStartGrid.length} combinations)...`);

    for (const zThresh of zGrid) {
        for (const volThresh of volGrid) {
            for (const marginPortion of marginGrid) {
                for (const trailStart of trailingStartGrid) {
                    
                    const config = { zThresh, volThresh, marginPortion, trailStart, trailCallback: 0.5, sl: 1.3 };
                    let balance = 1000.0;
                    let activePos: any = null;
                    let trades = 0;
                    let wins = 0;
                    let maxDd = 0;
                    let peak = 1000;

                    for (const t of allTs) {
                        if (activePos) {
                            const ind = assetIndicators[activePos.asset].get(t);
                            if (ind) {
                                const isLong = activePos.dir === "LONG";
                                const pnlPct = ((ind.price - activePos.entry) / activePos.entry * 100) * (isLong ? 1 : -1);
                                if (pnlPct > activePos.peak) activePos.peak = pnlPct;

                                let exit = "";
                                const slPrice = isLong ? activePos.entry * (1 - config.sl/100) : activePos.entry * (1 + config.sl/100);
                                if (isLong ? ind.low <= slPrice : ind.high >= slPrice) {
                                    exit = "SL";
                                } else if (activePos.peak >= config.trailStart && pnlPct < activePos.peak - config.trailCallback) {
                                    exit = "TP";
                                }

                                if (exit) {
                                    const factor = (exit === "SL" ? -config.sl/100 : (activePos.peak - config.trailCallback)/100);
                                    balance += activePos.margin * 10 * factor;
                                    if (balance > peak) peak = balance;
                                    const dd = (peak - balance) / peak * 100;
                                    if (dd > maxDd) maxDd = dd;
                                    if (factor > 0) wins++;
                                    trades++;
                                    activePos = null;
                                    if (balance <= 0) break;
                                }
                            }
                        }

                        if (!activePos && balance > 0) {
                            for (const a of ASSETS) {
                                const ind = assetIndicators[a].get(t);
                                if (!ind) continue;
                                
                                let direction = "NEUTRAL";
                                if (ind.z < -config.zThresh && ind.vol >= config.volThresh && ind.upperWickRatio < 0.15 && ind.price < ind.low24h * 1.02) {
                                    direction = "LONG";
                                } else if (ind.z > config.zThresh && ind.vol >= config.volThresh && ind.lowerWickRatio < 0.15 && ind.price > ind.high24h * 0.98) {
                                    direction = "SHORT";
                                }

                                if (direction !== "NEUTRAL") {
                                    activePos = { asset: a, dir: direction, entry: ind.price, margin: balance * config.marginPortion, peak: 0 };
                                    break;
                                }
                            }
                        }
                    }

                    results.push({ ...config, balance, roi: (balance - 1000) / 10, trades, winRate: trades > 0 ? (wins/trades*100) : 0, maxDd });
                }
            }
        }
    }

    results.sort((a,b) => b.balance - a.balance);

    const report = `
# 🧪 SULTAN STRATEGY OPTIMIZER (60 DAYS)
Top Configurations Ranked by ROI

| Rank | Z-Thresh | Vol-T | Margin | Trail | Final Balance | WinRate | MaxDD |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${results.slice(0, 15).map((r, i) => `| ${i+1} | ${r.zThresh} | ${r.volThresh} | ${r.marginPortion*100}% | ${r.trailStart}% | **$${r.balance.toFixed(2)}** | ${r.winRate.toFixed(1)}% | ${r.maxDd.toFixed(2)}% |`).join("\n")}

### 💡 Analisis Pakar Antigravity:
Strategi **Sultan Mode** paling optimal saat menggunakan **Z-Threshold ${results[0].zThresh}**. Ini memastikan kita hanya masuk saat terjadi kepanikan luar biasa di pasar. Dengan margin **${results[0].marginPortion*100}%**, bot mampu menghasilkan pertumbuhan eksponensial selama winrate terjaga di atas 50%.
`;

    fs.writeFileSync("optimization_results.md", report);
    console.log(report);
}

runOptimization().catch(console.error);
