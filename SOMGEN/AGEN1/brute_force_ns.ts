/**
 * AGEN1 — BRUTE FORCE: NORMAL + SAFETY MODES
 * Reuses same engine but with conservative parameter grids.
 */
import ccxt from "ccxt";

// ═══════════════ INDICATORS ═══════════════
function ema(data: number[], period: number): number {
    const k = 2 / (period + 1);
    let e = data[0];
    for (let i = 1; i < data.length; i++) e = (data[i] - e) * k + e;
    return e;
}
function rsi(data: number[], period: number = 14): number {
    if (data.length <= period) return 50;
    let gains = 0, losses = 0;
    for (let i = data.length - period; i < data.length; i++) {
        const d = data[i] - data[i - 1];
        if (d >= 0) gains += d; else losses -= d;
    }
    const rs = (gains / period) / ((losses / period) || 0.0001);
    return 100 - (100 / (1 + rs));
}
function atr(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    const trs: number[] = [];
    for (let i = 1; i < closes.length; i++) {
        trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1])));
    }
    return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

type MktType = "UP" | "DOWN" | "SIDE" | "BOOM";
function classifyMkt(c: number[][], emaSlow: number): MktType {
    const closes = c.map(x => x[4]);
    const highs = c.map(x => x[2]);
    const lows = c.map(x => x[3]);
    const e20 = ema(closes, 20);
    const e50 = ema(closes, emaSlow);
    const last = closes[closes.length - 1];
    const a = atr(highs, lows, closes, 20);
    const vol = (a / last) * 100;
    if (e20 > e50 && last > e50 * 1.005) return "UP";
    if (e20 < e50 && last < e50 * 0.995) return "DOWN";
    if (vol > 3.5) return "BOOM";
    return "SIDE";
}

interface Params {
    rsiOS: number; rsiOB: number; tpMult: number; slMult: number;
    trailPct: number; riskPct: number; leverage: number; emaSlow: number;
}

function simulate(allData: Record<string, number[][]>, params: Params, startBal: number): { balance: number, trades: number, wins: number, maxDD: number } {
    let balance = startBal;
    let peakBal = startBal;
    let maxDD = 0;
    let openTrade: any = null;
    let trades = 0, wins = 0;
    const coins = Object.keys(allData);
    const maxSteps = Math.min(...coins.map(c => allData[c].length));

    for (let t = 200; t < maxSteps; t++) {
        if (openTrade) {
            const candle = allData[openTrade.coin][t];
            if (!candle) { openTrade = null; continue; }
            const high = candle[2], low = candle[3], close = candle[4];
            const pnlPct = openTrade.side === "LONG"
                ? ((close - openTrade.entry) / openTrade.entry) * 100
                : ((openTrade.entry - close) / openTrade.entry) * 100;
            if (pnlPct > openTrade.peak) openTrade.peak = pnlPct;

            const slHit = openTrade.side === "LONG" ? (low <= openTrade.slPrice) : (high >= openTrade.slPrice);
            if (slHit) {
                const loss = openTrade.margin * params.leverage * (openTrade.slPctRaw / 100);
                balance -= Math.abs(loss);
                trades++;
            } else if (openTrade.peak >= openTrade.tpPctRaw && pnlPct <= openTrade.peak - params.trailPct) {
                const profit = openTrade.margin * params.leverage * (Math.max(pnlPct, openTrade.tpPctRaw * 0.8) / 100);
                balance += profit;
                trades++; wins++;
            } else { continue; }

            if (balance > peakBal) peakBal = balance;
            const dd = ((peakBal - balance) / peakBal) * 100;
            if (dd > maxDD) maxDD = dd;
            openTrade = null;
            if (balance <= startBal * 0.15) break;
            continue;
        }

        let bestSignal: any = null;
        for (const coin of coins) {
            const slice = allData[coin].slice(t - 200, t);
            if (slice.length < 200) continue;
            const mkt = classifyMkt(slice, params.emaSlow);
            const closes = slice.map(c => c[4]);
            const highs = slice.map(c => c[2]);
            const lows = slice.map(c => c[3]);
            const lastPrice = closes[closes.length - 1];
            const lastCandle = slice[slice.length - 1];
            const prevCandle = slice[slice.length - 2];
            const curRSI = rsi(closes, 14);
            const curATR = atr(highs, lows, closes, 14);
            const atrPct = (curATR / lastPrice) * 100;

            let dir: "LONG" | "SHORT" | null = null;
            let tpPct = 0, slPct = 0;

            if (mkt === "UP") {
                const e50 = ema(closes, params.emaSlow);
                if (curRSI < params.rsiOS + 10 && lastPrice <= e50 * 1.01 && lastPrice > e50 * 0.99) {
                    dir = "LONG"; tpPct = atrPct * params.tpMult; slPct = atrPct * params.slMult;
                }
            } else if (mkt === "DOWN") {
                const e50 = ema(closes, params.emaSlow);
                if (curRSI > params.rsiOB - 10 && lastPrice >= e50 * 0.99 && lastPrice < e50 * 1.01) {
                    dir = "SHORT"; tpPct = atrPct * params.tpMult; slPct = atrPct * params.slMult;
                }
            } else if (mkt === "SIDE") {
                const lastC = lastCandle[4], lastO = lastCandle[1];
                const prevC = prevCandle[4], prevO = prevCandle[1];
                if (curRSI < params.rsiOS && lastC > lastO && prevC <= prevO) {
                    dir = "LONG"; tpPct = atrPct * params.tpMult; slPct = atrPct * params.slMult;
                }
                if (curRSI > params.rsiOB && lastC < lastO && prevC >= prevO) {
                    dir = "SHORT"; tpPct = atrPct * params.tpMult; slPct = atrPct * params.slMult;
                }
            } else if (mkt === "BOOM") {
                const avgRange = slice.slice(-30, -1).reduce((s, c) => s + (c[2] - c[3]), 0) / 29;
                const curRange = lastCandle[2] - lastCandle[3];
                const lastC = lastCandle[4], lastO = lastCandle[1];
                if (curRange > avgRange * 3.5) {
                    dir = lastC > lastO ? "LONG" : "SHORT";
                    tpPct = atrPct * params.tpMult * 1.5; slPct = atrPct * params.slMult;
                }
            }

            if (dir && tpPct > 0) {
                const score = Math.abs(curRSI - 50) + (atrPct * 10);
                if (!bestSignal || score > bestSignal.score) {
                    bestSignal = { coin, dir, tpPct, slPct, entry: lastPrice, score };
                }
            }
        }

        if (bestSignal) {
            const margin = balance * (params.riskPct / 100);
            const slPrice = bestSignal.dir === "LONG"
                ? bestSignal.entry * (1 - bestSignal.slPct / 100)
                : bestSignal.entry * (1 + bestSignal.slPct / 100);
            openTrade = {
                coin: bestSignal.coin, side: bestSignal.dir, entry: bestSignal.entry,
                slPrice, slPctRaw: bestSignal.slPct, tpPctRaw: bestSignal.tpPct, margin, peak: 0
            };
        }
    }
    return { balance, trades, wins, maxDD };
}

// ═══════════════ PARAM GRIDS PER MODE ═══════════════

function buildGrid(mode: "NORMAL" | "SAFETY"): Params[] {
    const grid: Params[] = [];
    const leverages = mode === "NORMAL" ? [5, 10, 15, 20] : [2, 3, 5];
    const risks = mode === "NORMAL" ? [3, 5, 8, 10] : [1, 2, 3];
    const rsiLevels = [20, 25, 30];
    const tpMults = [2.0, 3.0, 4.0, 5.0];
    const slMults = [1.0, 1.5, 2.0];
    const trails = [0.2, 0.3, 0.5];

    for (const rsiOS of rsiLevels) {
        for (const tpMult of tpMults) {
            for (const slMult of slMults) {
                for (const trailPct of trails) {
                    for (const riskPct of risks) {
                        for (const leverage of leverages) {
                            grid.push({ rsiOS, rsiOB: 100 - rsiOS, tpMult, slMult, trailPct, riskPct, leverage, emaSlow: 50 });
                        }
                    }
                }
            }
        }
    }
    return grid;
}

// ═══════════════ MAIN ═══════════════
async function main() {
    const binance = new ccxt.binance({ options: { defaultType: 'future' } });
    const coins = ["BTC", "ETH", "SOL", "LINK", "FET", "WLD", "AVAX", "OP", "ARB", "SUI", "NEAR", "AAVE", "LTC", "DOGE", "XRP"];
    const days = 30;
    const tf = "5m";
    const totalCandles = days * 24 * 12;

    console.log(`📡 Downloading ${days} days of ${tf} data for ${coins.length} coins...`);
    const allData: Record<string, number[][]> = {};
    for (const coin of coins) {
        process.stdout.write(`  ${coin}...`);
        let candles: number[][] = [];
        let since = Date.now() - (days * 86400000);
        while (candles.length < totalCandles) {
            try {
                const batch = await binance.fetchOHLCV(`${coin}/USDT:USDT`, tf, since, 1000);
                if (!batch || batch.length === 0) break;
                candles = candles.concat(batch as number[][]);
                since = batch[batch.length - 1]![0]! + 300000;
            } catch { await new Promise(r => setTimeout(r, 500)); }
        }
        allData[coin] = candles;
        console.log(` ${candles.length} ✓`);
    }

    // ═══════════════ RUN BOTH MODES ═══════════════
    for (const mode of ["NORMAL", "SAFETY"] as const) {
        const startBal = mode === "NORMAL" ? 200 : 500;
        const grid = buildGrid(mode);
        console.log(`\n${"═".repeat(60)}`);
        console.log(`🔬 BRUTE FORCE: ${mode} MODE ($${startBal}) — ${grid.length} combos`);
        console.log(`${"═".repeat(60)}\n`);

        const results: any[] = [];
        for (let i = 0; i < grid.length; i++) {
            const p = grid[i];
            const res = simulate(allData, p, startBal);
            const profitPct = ((res.balance / startBal) - 1) * 100;
            const winRate = res.trades > 0 ? (res.wins / res.trades) * 100 : 0;
            results.push({ params: p, balance: res.balance, profitPct, trades: res.trades, winRate, maxDD: res.maxDD });

            if ((i + 1) % 100 === 0) {
                const best = results.reduce((a, b) => a.profitPct > b.profitPct ? a : b);
                console.log(`  [${i + 1}/${grid.length}] Best so far: +${best.profitPct.toFixed(1)}% ($${best.balance.toFixed(2)}) | WR: ${best.winRate.toFixed(0)}% | DD: ${best.maxDD.toFixed(1)}%`);
            }
        }

        // Filter: must have trades, drawdown limit per mode
        const maxDDLimit = mode === "NORMAL" ? 35 : 20;
        const safe = results.filter(r => r.maxDD < maxDDLimit && r.trades >= 10);
        safe.sort((a, b) => b.profitPct - a.profitPct);

        console.log(`\n🏆 TOP 10 — ${mode} MODE ($${startBal} start, MaxDD < ${maxDDLimit}%)\n`);
        for (let i = 0; i < Math.min(10, safe.length); i++) {
            const r = safe[i];
            console.log(`#${i + 1} | Profit: +${r.profitPct.toFixed(1)}% ($${r.balance.toFixed(2)}) | Trades: ${r.trades} | WR: ${r.winRate.toFixed(1)}% | MaxDD: ${r.maxDD.toFixed(1)}%`);
            console.log(`     RSI: ${r.params.rsiOS}/${r.params.rsiOB} | TP: ${r.params.tpMult}x | SL: ${r.params.slMult}x | Trail: ${r.params.trailPct}% | Risk: ${r.params.riskPct}% | Lev: ${r.params.leverage}x\n`);
        }

        if (safe.length > 0) {
            console.log(`\n🥇 CHAMPION ${mode}:`);
            console.log(JSON.stringify(safe[0].params, null, 2));
            console.log(`💰 $${startBal} → $${safe[0].balance.toFixed(2)} (+${safe[0].profitPct.toFixed(1)}%) | DD: ${safe[0].maxDD.toFixed(1)}%`);
        } else {
            console.log(`⚠️ No strategies passed the safety filter (MaxDD < ${maxDDLimit}%).`);
            // Show best without filter
            results.sort((a, b) => b.profitPct - a.profitPct);
            if (results.length > 0) {
                const b = results[0];
                console.log(`   Best unfiltered: +${b.profitPct.toFixed(1)}% | DD: ${b.maxDD.toFixed(1)}%`);
                console.log(JSON.stringify(b.params, null, 2));
            }
        }
    }
}

main().catch(console.error);
