/**
 * AGEN1 — BRUTE FORCE OPTIMIZER
 * Tests hundreds of parameter combos across 15 coins on 30 days of real Binance data.
 * Each trade: detect market type → pick best strategy → execute.
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

// ═══════════════ MARKET CLASSIFIER ═══════════════
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

// ═══════════════ PARAM GRID ═══════════════
interface Params {
    rsiOS: number;       // RSI Oversold threshold
    rsiOB: number;       // RSI Overbought threshold
    tpMult: number;      // TP as ATR multiplier
    slMult: number;      // SL as ATR multiplier
    trailPct: number;    // Trailing stop %
    riskPct: number;     // Risk per trade %
    leverage: number;
    emaSlow: number;     // Slow EMA for trend
}

const PARAM_GRID: Params[] = [];

// Build the grid
for (const rsiOS of [15, 20, 25, 30]) {
    for (const tpMult of [2.0, 3.0, 4.0, 5.0]) {
        for (const slMult of [1.0, 1.5, 2.0]) {
            for (const trailPct of [0.15, 0.25, 0.4]) {
                for (const riskPct of [10, 15, 20]) {
                    for (const leverage of [20, 35, 50]) {
                        PARAM_GRID.push({
                            rsiOS,
                            rsiOB: 100 - rsiOS,
                            tpMult,
                            slMult,
                            trailPct,
                            riskPct,
                            leverage,
                            emaSlow: 50
                        });
                    }
                }
            }
        }
    }
}

console.log(`🔬 AGEN1 BRUTE FORCE — ${PARAM_GRID.length} combinations to test`);

// ═══════════════ SIMULATION ENGINE ═══════════════
function simulate(allData: Record<string, number[][]>, params: Params, startBal: number): { balance: number, trades: number, wins: number, maxDD: number } {
    let balance = startBal;
    let peakBal = startBal;
    let maxDD = 0;
    let openTrade: any = null;
    let trades = 0, wins = 0;

    const coins = Object.keys(allData);
    const maxSteps = Math.min(...coins.map(c => allData[c].length));

    for (let t = 200; t < maxSteps; t++) {
        // ── MANAGE OPEN TRADE ──
        if (openTrade) {
            const candle = allData[openTrade.coin][t];
            if (!candle) { openTrade = null; continue; }
            const high = candle[2], low = candle[3], close = candle[4];

            const pnlPct = openTrade.side === "LONG"
                ? ((close - openTrade.entry) / openTrade.entry) * 100
                : ((openTrade.entry - close) / openTrade.entry) * 100;

            if (pnlPct > openTrade.peak) openTrade.peak = pnlPct;

            // Hard SL
            const slHit = openTrade.side === "LONG"
                ? (low <= openTrade.slPrice)
                : (high >= openTrade.slPrice);

            if (slHit) {
                const loss = openTrade.margin * params.leverage * (openTrade.slPctRaw / 100);
                balance -= Math.abs(loss);
                trades++;
            } else if (openTrade.peak >= openTrade.tpPctRaw && pnlPct <= openTrade.peak - params.trailPct) {
                // Trailing TP exit
                const profit = openTrade.margin * params.leverage * (Math.max(pnlPct, openTrade.tpPctRaw * 0.8) / 100);
                balance += profit;
                trades++;
                wins++;
            } else {
                continue; // Trade still open
            }

            // Track drawdown
            if (balance > peakBal) peakBal = balance;
            const dd = ((peakBal - balance) / peakBal) * 100;
            if (dd > maxDD) maxDD = dd;

            openTrade = null;
            if (balance <= startBal * 0.15) break; // Margin call
            continue;
        }

        // ── SCAN ALL COINS — DETECT MARKET TYPE PER COIN ──
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
            let reason = "";
            let tpPct = 0, slPct = 0;

            // ── STRATEGY PER MARKET TYPE ──
            if (mkt === "UP") {
                // TREND LONG: RSI dip + price near EMA
                const e50 = ema(closes, params.emaSlow);
                if (curRSI < params.rsiOS + 10 && lastPrice <= e50 * 1.01 && lastPrice > e50 * 0.99) {
                    dir = "LONG";
                    reason = `Trend Dip [${mkt}]`;
                    tpPct = atrPct * params.tpMult;
                    slPct = atrPct * params.slMult;
                }
            } else if (mkt === "DOWN") {
                // TREND SHORT: RSI bounce
                const e50 = ema(closes, params.emaSlow);
                if (curRSI > params.rsiOB - 10 && lastPrice >= e50 * 0.99 && lastPrice < e50 * 1.01) {
                    dir = "SHORT";
                    reason = `Trend Bounce [${mkt}]`;
                    tpPct = atrPct * params.tpMult;
                    slPct = atrPct * params.slMult;
                }
            } else if (mkt === "SIDE") {
                // RANGE: RSI extreme + candle confirmation
                const lastC = lastCandle[4], lastO = lastCandle[1];
                const prevC = prevCandle[4], prevO = prevCandle[1];
                
                if (curRSI < params.rsiOS && lastC > lastO && prevC <= prevO) {
                    dir = "LONG";
                    reason = `Range Oversold [${mkt}]`;
                    tpPct = atrPct * params.tpMult;
                    slPct = atrPct * params.slMult;
                }
                if (curRSI > params.rsiOB && lastC < lastO && prevC >= prevO) {
                    dir = "SHORT";
                    reason = `Range Overbought [${mkt}]`;
                    tpPct = atrPct * params.tpMult;
                    slPct = atrPct * params.slMult;
                }
            } else if (mkt === "BOOM") {
                // VOLATILITY: Big candle breakout
                const avgRange = slice.slice(-30, -1).reduce((s, c) => s + (c[2] - c[3]), 0) / 29;
                const curRange = lastCandle[2] - lastCandle[3];
                const lastC = lastCandle[4], lastO = lastCandle[1];

                if (curRange > avgRange * 3.5) {
                    if (lastC > lastO) {
                        dir = "LONG";
                        reason = `Boom Breakout [${mkt}]`;
                    } else {
                        dir = "SHORT";
                        reason = `Boom Breakdown [${mkt}]`;
                    }
                    tpPct = atrPct * params.tpMult * 1.5;
                    slPct = atrPct * params.slMult;
                }
            }

            if (dir && tpPct > 0) {
                const score = Math.abs(curRSI - 50) + (atrPct * 10); // Higher = stronger signal
                if (!bestSignal || score > bestSignal.score) {
                    bestSignal = { coin, dir, reason, tpPct, slPct, entry: lastPrice, score };
                }
            }
        }

        // ── EXECUTE BEST SIGNAL ──
        if (bestSignal) {
            const margin = balance * (params.riskPct / 100);
            const slPrice = bestSignal.dir === "LONG"
                ? bestSignal.entry * (1 - bestSignal.slPct / 100)
                : bestSignal.entry * (1 + bestSignal.slPct / 100);

            openTrade = {
                coin: bestSignal.coin,
                side: bestSignal.dir,
                entry: bestSignal.entry,
                slPrice,
                slPctRaw: bestSignal.slPct,
                tpPctRaw: bestSignal.tpPct,
                margin,
                peak: 0
            };
        }
    }

    return { balance, trades, wins, maxDD };
}

// ═══════════════ MAIN ═══════════════
async function main() {
    const binance = new ccxt.binance({ options: { defaultType: 'future' } });
    const coins = ["BTC", "ETH", "SOL", "LINK", "FET", "WLD", "AVAX", "OP", "ARB", "SUI", "NEAR", "AAVE", "LTC", "DOGE", "XRP"];
    const days = 30;
    const tf = "5m"; // 5m for speed — still very granular
    const totalCandles = days * 24 * 12; // 8640 candles per coin

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
        console.log(` ${candles.length} candles ✓`);
    }

    console.log(`\n🔥 Starting brute-force across ${PARAM_GRID.length} combinations...`);
    console.log(`   Each combo simulates ${Object.keys(allData).length} coins × ${Math.min(...Object.values(allData).map(d => d.length))} time steps\n`);

    const startBal = 20;
    const results: { params: Params; balance: number; profitPct: number; trades: number; winRate: number; maxDD: number }[] = [];

    for (let i = 0; i < PARAM_GRID.length; i++) {
        const p = PARAM_GRID[i];
        const res = simulate(allData, p, startBal);

        const profitPct = ((res.balance / startBal) - 1) * 100;
        const winRate = res.trades > 0 ? (res.wins / res.trades) * 100 : 0;

        results.push({ params: p, balance: res.balance, profitPct, trades: res.trades, winRate, maxDD: res.maxDD });

        if ((i + 1) % 100 === 0) {
            const best = results.reduce((a, b) => a.profitPct > b.profitPct ? a : b);
            console.log(`  [${i + 1}/${PARAM_GRID.length}] Best so far: +${best.profitPct.toFixed(1)}% ($${best.balance.toFixed(2)}) | WR: ${best.winRate.toFixed(0)}% | DD: ${best.maxDD.toFixed(1)}%`);
        }
    }

    // ═══════════════ TOP 10 RESULTS ═══════════════
    // Sort by profit but filter out extreme drawdown (>60%)
    const safe = results.filter(r => r.maxDD < 60 && r.trades >= 10);
    safe.sort((a, b) => b.profitPct - a.profitPct);

    console.log(`\n🏆 ═══════════════════════════════════════════════════════`);
    console.log(`   TOP 10 BEST STRATEGIES (30 Days, $${startBal} start, ${coins.length} coins)`);
    console.log(`═══════════════════════════════════════════════════════\n`);

    for (let i = 0; i < Math.min(10, safe.length); i++) {
        const r = safe[i];
        console.log(`#${i + 1} | Profit: +${r.profitPct.toFixed(1)}% ($${r.balance.toFixed(2)}) | Trades: ${r.trades} | WR: ${r.winRate.toFixed(1)}% | MaxDD: ${r.maxDD.toFixed(1)}%`);
        console.log(`     RSI: ${r.params.rsiOS}/${r.params.rsiOB} | TP: ${r.params.tpMult}x | SL: ${r.params.slMult}x | Trail: ${r.params.trailPct}% | Risk: ${r.params.riskPct}% | Lev: ${r.params.leverage}x`);
        console.log(``);
    }

    // Best result
    if (safe.length > 0) {
        const best = safe[0];
        console.log(`\n🥇 CHAMPION STRATEGY:`);
        console.log(JSON.stringify(best.params, null, 2));
        console.log(`\n💰 $${startBal} → $${best.balance.toFixed(2)} (+${best.profitPct.toFixed(1)}%) in 30 days`);
        console.log(`📊 ${best.trades} trades | Win Rate: ${best.winRate.toFixed(1)}% | Max Drawdown: ${best.maxDD.toFixed(1)}%`);
    }
}

main().catch(console.error);
