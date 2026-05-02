import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyze, analyzeBreakout, rsi, ema, bollingerBands, atr } from "../dist/survival/technicals.js";
import fs from "fs";

/**
 * 🚀 Strategy Hyper-Optimizer v2 (Breakout + Reversion)
 */

const ASSETS = ["DOGE", "SOL"];
const START_BALANCE = 100;
const LEVERAGE = 10;
const LOOKBACK_DAYS = 90; // Extended to 90 days for Badag Consistency test
const DAY_SEC = 24 * 60 * 60;
const OUTPUT_PATH = "backtest-results-master.md"; // Use relative path for sync script

const STRATEGIES = ["REVERSION", "BREAKOUT"];
const TIMEFRAMES = ["1h", "15m"];
const RSI_LEVELS = [
    { low: 30, high: 70 },
    { low: 34, high: 66 }
];
const ATR_TP_MULTIS = [2.0, 3.5, 5.0, 7.5];
const ATR_SL_MULTIS = [1.0, 1.5, 2.0];
const VOL_SURGE_LEVELS = [1.2, 1.8, 2.5];

async function fetchCandles(info, coin, interval, days) {
    const endTime = Date.now();
    const startTime = endTime - (days * DAY_SEC * 1000);
    let all = [];
    let currentStart = startTime;
    const chunkMs = 15 * DAY_SEC * 1000;

    console.log(`Fetching ${interval} data for ${coin}...`);
    while (currentStart < endTime) {
        const chunkEnd = Math.min(currentStart + chunkMs, endTime);
        try {
            const raw = await info.candleSnapshot({ coin, interval, startTime: currentStart, endTime: chunkEnd });
            if (raw && raw.length > 0) {
                all = all.concat(raw.map(c => ({
                    t: c.t, o: parseFloat(c.o), h: parseFloat(c.h), l: parseFloat(c.l),
                    c: parseFloat(c.c), v: parseFloat(c.v), n: c.n || 0
                })));
            }
            await new Promise(r => setTimeout(r, 50));
        } catch (e) {}
        currentStart = chunkEnd;
    }
    const unique = new Map();
    all.forEach(c => unique.set(c.t, c));
    return Array.from(unique.values()).sort((a, b) => a.t - b.t);
}

async function runOptimizer() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    const results = [];

    const cache = {};
    for (const tf of TIMEFRAMES) {
        cache[tf] = {};
        for (const asset of ASSETS) {
            cache[tf][asset] = await fetchCandles(info, asset, tf, LOOKBACK_DAYS + 10);
        }
    }

    console.log(`\n🔥 Launching V2 Brute-Force (${STRATEGIES.join(" & ")}) for ${ASSETS.join(", ")}...`);

    for (const stratType of STRATEGIES) {
        for (const tf of TIMEFRAMES) {
            const rsiGrid = stratType === "REVERSION" ? RSI_LEVELS : [{ low: 0, high: 100 }];
            const volGrid = stratType === "BREAKOUT" ? VOL_SURGE_LEVELS : [1.0];

            for (const rsiCfg of rsiGrid) {
                for (const volThresh of volGrid) {
                    for (const tpMulti of ATR_TP_MULTIS) {
                        for (const slMulti of ATR_SL_MULTIS) {

                            let combinedNetPnl = 0;
                            let totalTrades = 0;
                            let wins = 0;

                            for (const asset of ASSETS) {
                                const data = cache[tf][asset];
                                if (data.length < 250) continue;

                                let modal = 100;
                                let activeTrade = null;

                                for (let i = 200; i < data.length; i++) {
                                    const candle = data[i];
                                    if (activeTrade) {
                                        let closed = false;
                                        let profitPct = 0;
                                        if (activeTrade.side === "LONG") {
                                            if (candle.l <= activeTrade.sl) { profitPct = -activeTrade.dSl; closed = true; }
                                            else if (candle.h >= activeTrade.tp) { profitPct = activeTrade.dTp; closed = true; }
                                        } else {
                                            if (candle.h >= activeTrade.sl) { profitPct = -activeTrade.dSl; closed = true; }
                                            else if (candle.l <= activeTrade.tp) { profitPct = activeTrade.dTp; closed = true; }
                                        }

                                        if (closed) {
                                            const profitUsdc = (modal * 0.7 * LEVERAGE * (profitPct / 100));
                                            modal += profitUsdc;
                                            totalTrades++;
                                            if (profitPct > 0) wins++;
                                            activeTrade = null;
                                            if (modal <= 0) break;
                                        }
                                        continue;
                                    }

                                    const hist = data.slice(i - 200, i + 1);
                                    const closes = hist.map(c => c.c);
                                    const currentPrice = closes[closes.length - 1];

                                    let dir = "NEUTRAL";
                                    let sig = null;

                                    if (stratType === "REVERSION") {
                                        const currentRsi = rsi(closes, 14);
                                        const ema200Arr = ema(closes, 200);
                                        const ema200 = ema200Arr[ema200Arr.length - 1];
                                        if (currentRsi < rsiCfg.low && currentPrice > ema200) dir = "LONG";
                                        else if (currentRsi > rsiCfg.high && currentPrice < ema200) dir = "SHORT";
                                        if (dir !== "NEUTRAL") sig = analyze(hist);
                                    } else {
                                        sig = analyzeBreakout(hist, 0, { volumeSurgeThreshold: volThresh, atrTpMultiplier: tpMulti, atrSlMultiplier: slMulti, confBase: 40 });
                                        if (sig.direction !== "NEUTRAL") dir = sig.direction;
                                    }

                                    if (dir !== "NEUTRAL" && sig) {
                                        const atrPct = sig.indicators.atrPct;
                                        const dTp = atrPct * tpMulti;
                                        const dSl = atrPct * slMulti;
                                        activeTrade = { asset, side: dir, tp: dir === "LONG" ? currentPrice * (1 + dTp / 100) : currentPrice * (1 - dTp / 100), sl: dir === "LONG" ? currentPrice * (1 - dSl / 100) : currentPrice * (1 + dSl / 100), dTp, dSl };
                                    }
                                }
                                combinedNetPnl += (modal - 100);
                            }

                            results.push({
                                stratType, tf, rsiCfg, tpMulti, slMulti, volThresh,
                                netProfit: combinedNetPnl,
                                totalTrades,
                                winRate: totalTrades > 0 ? (wins / totalTrades * 100).toFixed(1) : 0
                            });
                        }
                    }
                }
            }
        }
    }

    results.sort((a, b) => b.netProfit - a.netProfit);
    const report = `# 🏆 Badag Profit Master Report (30-Day V2 Brute-Force)
Target: DOGE & SOL | Leverage: ${LEVERAGE}x | Tested: ${results.length} combos

| Rank | Strategy | TF | RSI L/H | Vol S. | ATR TP | Profit | Trades | WR |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${results.slice(0, 15).map((r, i) => `| ${i + 1} | ${r.stratType} | ${r.tf} | ${r.rsiCfg.low}/${r.rsiCfg.high} | ${r.volThresh}x | ${r.tpMulti}x | **$${r.netProfit.toFixed(2)}** | ${r.totalTrades} | ${r.winRate}% |`).join("\n")}
`;
    fs.writeFileSync(OUTPUT_PATH, report);
    if (results.length > 0) {
        console.log(`\n🏆 TOP RESULT: ${results[0].stratType} ${results[0].tf} | Profit: $${results[0].netProfit.toFixed(2)}`);
    }
}

runOptimizer();
