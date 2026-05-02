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

/**
 * CHAMELEON SNIPER V3
 * Hunts for extreme statistical outliers combined with volume confirmation.
 */
export function analyzeChameleonWick(candles: Candle[]): any {
    if (candles.length < 30) return { direction: "NEUTRAL" };

    const current = candles[candles.length - 1];
    const closes = candles.map(c => c.c);
    
    // 1. Z-Score Statistical Check (Must be 2.8+ StdDevs away from mean)
    const currentZ = zScore(closes, 20);
    
    // 2. Heavy Volume Surge Check (2.0x Average)
    const volRatio = volumeSurge(candles, 20);

    // 3. 24-Hour Historical Context
    const window24h = candles.slice(-96); 
    const low24h = Math.min(...window24h.map(c => c.l));
    const high24h = Math.max(...window24h.map(c => c.h));

    // 4. Wick Rejection Filter
    const totalLength = current.h - current.l;
    const bodyTop = Math.max(current.o, current.c);
    const bodyBottom = Math.min(current.o, current.c);
    const upperWick = current.h - bodyTop;
    const lowerWick = bodyBottom - current.l;
    const upperWickRatio = totalLength > 0 ? upperWick / totalLength : 0;
    const lowerWickRatio = totalLength > 0 ? lowerWick / totalLength : 0;

    // --- TRIGGER LOGIC ---

    // LONG SNIPER: Panic Bottom
    if (currentZ < -2.8 && volRatio >= 2.0 && upperWickRatio < 0.15 && current.c < low24h * 1.02) {
        return { 
            direction: "LONG",
            confidence: 98,
            zScore: currentZ,
            volSurge: volRatio,
            tp: 2.5, 
            sl: 1.0  
        };
    }

    // SHORT SNIPER: Fomo Top
    if (currentZ > 2.8 && volRatio >= 2.0 && lowerWickRatio < 0.15 && current.c > high24h * 0.98) {
        return { 
            direction: "SHORT",
            confidence: 98,
            zScore: currentZ,
            volSurge: volRatio,
            tp: 2.5, 
            sl: 1.0  
        };
    }

    return { direction: "NEUTRAL" };
}
