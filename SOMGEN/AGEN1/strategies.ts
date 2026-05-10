/**
 * AGEN1 - SPECIALIZED STRATEGY LIBRARY
 * Different algorithms for different market regimes.
 */

export type MarketType = "TRENDING_UP" | "TRENDING_DOWN" | "SIDEWAYS" | "VOLATILE" | "UNKNOWN";

export interface StrategySignal {
    direction: "LONG" | "SHORT" | "NEUTRAL";
    reason: string;
    tp: number;
    sl: number;
}

// --- INDICATORS ---

export function calculateEMA(data: number[], period: number): number {
    const k = 2 / (period + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
        ema = (data[i] - ema) * k + ema;
    }
    return ema;
}

export function calculateRSI(data: number[], period: number = 14): number {
    if (data.length <= period) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = data.length - period; i < data.length; i++) {
        const diff = data[i] - data[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    const rs = (gains / period) / (losses / period || 1);
    return 100 - (100 / (1 + rs));
}

export function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    const trs: number[] = [];
    for (let i = 1; i < closes.length; i++) {
        const h = highs[i], l = lows[i], pc = closes[i - 1];
        trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// --- MARKET CLASSIFIER ---

export function classifyMarket(ohlcv: any[]): MarketType {
    const closes = ohlcv.map(c => (c.c || c[4]));
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);
    const lastPrice = closes[closes.length - 1];
    
    const highs = ohlcv.map(c => (c.h || c[2]));
    const lows = ohlcv.map(c => (c.l || c[3]));
    const atr = calculateATR(highs, lows, closes, 20);
    const volRatio = (atr / lastPrice) * 100;

    // Stronger Trend: EMAs must be stacked and price must be far from 200
    if (ema20 > ema50 && ema50 > ema200 && lastPrice > ema50 * 1.01) return "TRENDING_UP";
    if (ema20 < ema50 && ema50 < ema200 && lastPrice < ema50 * 0.99) return "TRENDING_DOWN";

    if (volRatio > 3.5) return "VOLATILE";

    return "SIDEWAYS";
}

// --- STRATEGIES ---

/**
 * STRATEGY 1: TREND HUNTER (ELITE)
 * Only enters on extreme pullbacks in a strong trend.
 */
export function trendHunter(ohlcv: any[], type: MarketType): StrategySignal {
    const closes = ohlcv.map(c => (c.c || c[4]));
    const highs = ohlcv.map(c => (c.h || c[2]));
    const lows = ohlcv.map(c => (c.l || c[3]));
    const lastPrice = closes[closes.length - 1];
    
    const ema50 = calculateEMA(closes, 50);
    const atr = calculateATR(highs, lows, closes, 14);
    const atrPct = (atr / lastPrice) * 100;
    const rsi = calculateRSI(closes, 14);

    if (type === "TRENDING_UP") {
        // Buy only on deep RSI dip in uptrend
        if (lastPrice <= ema50 * 1.005 && rsi < 35) {
            return { direction: "LONG", reason: "Deep Trend Dip", tp: atrPct * 3.0, sl: atrPct * 1.5 };
        }
    }

    if (type === "TRENDING_DOWN") {
        if (lastPrice >= ema50 * 0.995 && rsi > 65) {
            return { direction: "SHORT", reason: "Deep Trend Bounce", tp: atrPct * 3.0, sl: atrPct * 1.5 };
        }
    }

    return { direction: "NEUTRAL", reason: "No deep entry", tp: 0, sl: 0 };
}

/**
 * STRATEGY 2: RANGE SNIPER (ELITE V3)
 * High precision RSI reversal with CANDLE CONFIRMATION.
 */
export function rangeSniper(ohlcv: any[], type: MarketType): StrategySignal {
    const candles = ohlcv.map(c => ({
        o: c.o || c[1],
        h: c.h || c[2],
        l: c.l || c[3],
        c: c.c || c[4]
    }));
    
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const closes = candles.map(c => c.c);
    const rsi = calculateRSI(closes, 14);
    const lastPrice = last.c;
    
    const highs = candles.map(c => c.h);
    const lows = candles.map(c => c.l);
    const atr = calculateATR(highs, lows, closes, 14);
    const atrPct = (atr / lastPrice) * 100;
    
    if (type !== "SIDEWAYS") return { direction: "NEUTRAL", reason: "Not Sideways", tp: 0, sl: 0 };

    // LONG: RSI < 20 AND Last candle is BULLISH (c > o) after a BEARISH candle
    if (rsi < 20 && last.c > last.o && prev.c <= prev.o) {
        return { direction: "LONG", reason: "RSI Oversold + Bullish Confirm", tp: atrPct * 3.0, sl: atrPct * 1.5 };
    }
    
    // SHORT: RSI > 80 AND Last candle is BEARISH (c < o) after a BULLISH candle
    if (rsi > 80 && last.c < last.o && prev.c >= prev.o) {
        return { direction: "SHORT", reason: "RSI Overbought + Bearish Confirm", tp: atrPct * 3.0, sl: atrPct * 1.5 };
    }

    return { direction: "NEUTRAL", reason: "Waiting for confirm", tp: 0, sl: 0 };
}


/**
 * STRATEGY 3: VOLATILITY BREAKER (SNIPER)
 */
export function volatilityBreaker(ohlcv: any[], type: MarketType): StrategySignal {
    const lastCandle = ohlcv[ohlcv.length - 1];
    const prevCandles = ohlcv.slice(-30, -1);
    
    const lastC = lastCandle.c || lastCandle[4];
    const lastO = lastCandle.o || lastCandle[1];
    const lastH = lastCandle.h || lastCandle[2];
    const lastL = lastCandle.l || lastCandle[3];
    
    const avgRange = prevCandles.reduce((s, c) => s + ((c.h || c[2]) - (c.l || c[3])), 0) / 29;
    const currentRange = lastH - lastL;

    // Only break out if range is 4x the average (true explosion)
    if (currentRange > avgRange * 4.0) {
        if (lastC > lastO && (lastH - lastC) < (lastC - lastO) * 0.1) { 
            return { direction: "LONG", reason: "True Bullish Explosion", tp: 5.0, sl: 2.0 };
        }
        if (lastC < lastO && (lastC - lastL) < (lastO - lastC) * 0.1) {
            return { direction: "SHORT", reason: "True Bearish Explosion", tp: 5.0, sl: 2.0 };
        }
    }

    return { direction: "NEUTRAL", reason: "No explosion", tp: 0, sl: 0 };
}


