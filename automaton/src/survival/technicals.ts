/**
 * THE CHAMELEON PREDATOR - Core Technical Engine
 * Strictly Focused: High-Probability Wick Rejection Sniper
 */

export interface Candle {
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    n: number;
}

export interface TASignal {
    direction: "LONG" | "SHORT" | "NEUTRAL";
    confidence: number;
    tp: number;
    sl: number;
    indicators: any;
}

// --- CORE INDICATORS ---

export function sma(data: number[], period: number): number[] {
    const results: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            results.push(data[i]);
            continue;
        }
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[i - j];
        results.push(sum / period);
    }
    return results;
}

export function ema(data: number[], period: number): number[] {
    const results: number[] = [];
    const k = 2 / (period + 1);
    let emaVal = data[0];
    for (let i = 0; i < data.length; i++) {
        emaVal = (data[i] - emaVal) * k + emaVal;
        results.push(emaVal);
    }
    return results;
}

export function atr(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) return 0;
    const trs: number[] = [];
    for (let i = 1; i < candles.length; i++) {
        const h = candles[i].h;
        const l = candles[i].l;
        const pc = candles[i - 1].c;
        trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    const sum = trs.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
}

export function zScore(data: number[], period: number): number {
    if (data.length < period) return 0;
    const slice = data.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    return stdDev === 0 ? 0 : (data[data.length - 1] - mean) / stdDev;
}

export function volumeSurge(candles: Candle[], period: number): number {
    if (candles.length < period + 1) return 1;
    const slice = candles.slice(-period - 1, -1);
    const avgVol = slice.reduce((a, b) => a + b.v, 0) / period;
    const currentVol = candles[candles.length - 1].v;
    return avgVol === 0 ? 1 : currentVol / avgVol;
}

// --- MAIN STRATEGY: CHAMELEON SNIPER ---

export let STRATEGY_CONFIG = {
    zThreshold: 2.6,
    volThreshold: 1.3,
    rsiThresholdLow: 30,
    rsiThresholdHigh: 70,
    wickThreshold: 0.05,
    tp: 1.2,
    sl: 1.0
};


export function setStrategyConfig(config: any) {
    STRATEGY_CONFIG = { ...STRATEGY_CONFIG, ...config };
}

/**
 * CHAMELEON SNIPER V3
 * Hunts for extreme statistical outliers combined with volume confirmation.
 */
export function rsi(data: number[], period: number = 14): number[] {
    const results: number[] = [];
    if (data.length <= period) return new Array(data.length).fill(50);

    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            results.push(50);
            continue;
        }
        
        const slice = data.slice(i - period, i + 1);
        let gains = 0;
        let losses = 0;
        
        for (let j = 1; j < slice.length; j++) {
            const diff = slice[j] - slice[j - 1];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        results.push(100 - (100 / (1 + rs)));
    }
    return results;
}


export function analyzeChameleonWick(candles: Candle[]): any {
    if (candles.length < 50) return { direction: "NEUTRAL" };

    const current = candles[candles.length - 1];
    const closes = candles.map(c => c.c);
    
    const currentZ = zScore(closes, 20);
    const volRatio = volumeSurge(candles, 20);

    const window24h = candles.slice(-96); // 24h on 15m timeframe
    const low24h = Math.min(...window24h.map(c => c.l));
    const high24h = Math.max(...window24h.map(c => c.h));

    const totalLength = current.h - current.l;
    const bodyBottom = Math.min(current.o, current.c);
    const bodyTop = Math.max(current.o, current.c);
    const lowerWickRatio = totalLength > 0 ? (bodyBottom - current.l) / totalLength : 0;
    const upperWickRatio = totalLength > 0 ? (current.h - bodyTop) / totalLength : 0;

    // --- TRIGGER LOGIC: THE PREDATOR ARMY (Dynamic) ---

    // LONG
    if (currentZ < -STRATEGY_CONFIG.zThreshold && volRatio > STRATEGY_CONFIG.volThreshold && lowerWickRatio > STRATEGY_CONFIG.wickThreshold) {
        return { direction: "LONG", tp: STRATEGY_CONFIG.tp, sl: STRATEGY_CONFIG.sl, zScore: currentZ, volSurge: volRatio };
    }

    // SHORT
    if (currentZ > STRATEGY_CONFIG.zThreshold && volRatio > STRATEGY_CONFIG.volThreshold && upperWickRatio > STRATEGY_CONFIG.wickThreshold) {
        return { direction: "SHORT", tp: STRATEGY_CONFIG.tp, sl: STRATEGY_CONFIG.sl, zScore: currentZ, volSurge: volRatio };
    }


    return { direction: "NEUTRAL", zScore: currentZ, volSurge: volRatio };
}

