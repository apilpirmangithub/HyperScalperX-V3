import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";

/**
 * 24-HOUR REAL DATA SIMULATION (NEXUS HOLY GRAIL)
 */

const CONFIG = {
    ASSETS: ["BTC", "ETH", "HYPE", "SOL", "CHIP", "ZEC", "LDO", "XRP", "AAVE", "FARTCOIN", "DOGE", "LINK", "TIA", "SEI", "WLD"],
    LEVERAGE: 10,
    MARGIN_PORTION: 0.35,
    COOLDOWN_MS: 30 * 60 * 1000,
    FEE_PCT: 0.04 / 100, 
    SLIPPAGE_PCT: 0.02 / 100
};

const START_BALANCE = 40;
const START_DATE = Date.now() - (24 * 60 * 60 * 1000); // 24 Hours ago
const END_DATE = Date.now();

function calculateZScore(prices, period = 20) {
    if (prices.length < period) return 0;
    const slice = prices.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    return stdDev === 0 ? 0 : (prices[prices.length - 1] - mean) / stdDev;
}

async function fetchCandles(info, coin, start, end) {
    const raw = await info.candleSnapshot({ coin, interval: "15m", startTime: start, endTime: end });
    return raw.map(c => ({
        t: c.t, o: parseFloat(c.o), h: parseFloat(c.h), l: parseFloat(c.l), c: parseFloat(c.c), v: parseFloat(c.v)
    })).sort((a, b) => a.t - b.t);
}

function analyzeNexus(candles) {
    if (candles.length < 96) return { direction: "NEUTRAL" };
    const current = candles[candles.length - 1];
    const closes = candles.map(c => c.c);
    const z = calculateZScore(closes, 20);
    const avgVol = candles.slice(-21, -1).reduce((a, c) => a + c.v, 0) / 20;
    const vol = current.v / avgVol;
    const low24 = Math.min(...candles.map(c => c.l));
    const high24 = Math.max(...candles.map(c => c.h));
    const total = current.h - current.l;
    const uw = total > 0 ? (current.h - Math.max(current.o, current.c)) / total : 0;
    const lw = total > 0 ? (Math.min(current.o, current.c) - current.l) / total : 0;

    if (z < -2.8 && vol >= 2.0 && uw < 0.15 && current.c < low24 * 1.02) return { direction: "LONG", tp: 2.5, sl: 1.0 };
    if (z > 2.8 && vol >= 2.0 && lw < 0.15 && current.c > high24 * 0.98) return { direction: "SHORT", tp: 2.5, sl: 1.0 };
    return { direction: "NEUTRAL" };
}

async function run() {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    const marketData = {};
    for (const asset of CONFIG.ASSETS) {
        // Need historical buffer for Z-score and 24h context
        marketData[asset] = await fetchCandles(info, asset, START_DATE - (250 * 15 * 60 * 1000), END_DATE);
    }

    let balance = START_BALANCE;
    let activeTrade = null;
    let lastTradeTime = {};
    const tradeLog = [];

    const allTimestamps = [...new Set(Object.values(marketData).flatMap(data => data.map(c => c.t)))]
        .filter(t => t >= START_DATE)
        .sort((a, b) => a - b);

    for (const currentT of allTimestamps) {
        if (activeTrade) {
            const candle = marketData[activeTrade.asset].find(c => c.t === currentT);
            if (candle) {
                let closed = false, isSl = false;
                if (activeTrade.side === "LONG") {
                    if (candle.l <= activeTrade.sl) { closed = true; isSl = true; }
                    else if (candle.h >= activeTrade.tp) { closed = true; isSl = false; }
                } else {
                    if (candle.h >= activeTrade.sl) { closed = true; isSl = true; }
                    else if (candle.l <= activeTrade.tp) { closed = true; isSl = false; }
                }
                if (closed) {
                    const profitPct = isSl ? -activeTrade.slPct : activeTrade.tpPct;
                    const marginValue = activeTrade.margin * CONFIG.LEVERAGE;
                    const gross = marginValue * (profitPct / 100);
                    const cost = marginValue * (CONFIG.FEE_PCT + CONFIG.SLIPPAGE_PCT) * 2;
                    const net = gross - cost;
                    balance += net;
                    tradeLog.push({ ...activeTrade, exitTime: new Date(currentT).toLocaleTimeString(), net: net.toFixed(2), finalBal: balance.toFixed(2), result: isSl ? "LOSS" : "WIN" });
                    lastTradeTime[activeTrade.asset] = currentT;
                    activeTrade = null;
                }
            }
        }

        if (!activeTrade) {
            for (const asset of CONFIG.ASSETS) {
                const coinData = marketData[asset];
                const idx = coinData.findIndex(c => c.t === currentT);
                if (idx < 1) continue;
                const window = coinData.slice(Math.max(0, idx - 250), idx + 1);
                if (lastTradeTime[asset] && (currentT - lastTradeTime[asset] < CONFIG.COOLDOWN_MS)) continue;

                const sig = analyzeNexus(window);
                if (sig.direction !== "NEUTRAL") {
                    const isLong = sig.direction === "LONG";
                    const entry = coinData[idx - 1].c * (isLong ? 0.975 : 1.025);
                    activeTrade = {
                        asset, side: sig.direction, entry: entry.toFixed(4),
                        tp: (isLong ? entry * 1.025 : entry * 0.975).toFixed(4),
                        sl: (isLong ? entry * 0.99 : entry * 1.01).toFixed(4),
                        tpPct: 2.5, slPct: 1.0, margin: balance * CONFIG.MARGIN_PORTION,
                        time: new Date(currentT).toLocaleTimeString()
                    };
                    break;
                }
            }
        }
    }

    console.log("==========================================");
    console.log("📊 REAL-DATA SIMULATION (LAST 24 HOURS)");
    console.log(`Initial: $${START_BALANCE} | Current: $${balance.toFixed(2)}`);
    console.log("==========================================");
    tradeLog.forEach((t, i) => {
        console.log(`[${i+1}] ${t.time} - ${t.asset} ${t.side}`);
        console.log(`    Entry: ${t.entry} | TP: ${t.tp} | SL: ${t.sl}`);
        console.log(`    Result: ${t.result} | Net: $${t.net} | Bal: $${t.finalBal}`);
    });
}
run();
