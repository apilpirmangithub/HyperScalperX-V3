/**
 * HypeKing Global Asset Scanner (Top 10 Finder)
 * 🕵️ Scanning 30+ assets to find the most profitable "Smart Predator" candidates.
 */

import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { analyze, type Candle } from "../src/survival/technicals.js";

const START_MODAL = 25.0;
const LEVERAGE = 10;
const LOOKBACK_DAYS = 7;

// Smart Predator Parameters (The 5.5x Moonshot)
const TP_M = 5.5;
const SL_M = 1.0;
const CONF = 45;
const RISK = 0.85;

const CANDIDATES = [
    "BTC", "ETH", "SOL", "SUI", "SEI", "NEAR", "TIA", "HYPE", "ARB", "OP", 
    "APT", "AVAX", "LINK", "PEPE", "DOGE", "WLD", "ORDI", "INJ", "RNDR", "FET", 
    "STX", "KAS", "TAO", "PENDLE", "ONDO", "LDO", "AAVE", "MKR", "ENA", "DYDX"
];

async function scan() {
    console.log("═══════════════════════════════════════════════════");
    console.log("🕵️  STARTING GLOBAL ASSET SCANNER ($25 ELITE 10)");
    console.log("═══════════════════════════════════════════════════");

    const transport = new HttpTransport();
    const info = new InfoClient({ transport });

    const results: any[] = [];

    for (const asset of CANDIDATES) {
        try {
            process.stdout.write(`[SCAN] Analyzing ${asset}... `);
            const raw = await info.candleSnapshot({
                coin: asset,
                interval: "5m",
                startTime: Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
                endTime: Date.now()
            }) as any[];
            
            if (!raw || raw.length < 200) {
                console.log("Skipped (Not enough data)");
                continue;
            }

            const data = raw.map(c => ({
                t: c.t, o: parseFloat(c.o), h: parseFloat(c.h), l: parseFloat(c.l),
                c: parseFloat(c.c), v: parseFloat(c.v), n: c.n
            }));

            const performance = simulate(data, TP_M, SL_M, CONF, RISK);
            results.push({ asset, ...performance });
            console.log(`ROI: ${((performance.netProfit/START_MODAL)*100).toFixed(1)}% | Trades: ${performance.trades}`);
            
            // Short delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (e) {
            console.log(`Error scanning ${asset}`);
        }
    }

    // Rank by Net Profit
    const top10 = results.sort((a, b) => b.netProfit - a.netProfit).slice(0, 10);
    printElite10(top10);
}

function simulate(candles: Candle[], tpM: number, slM: number, minConf: number, riskPct: number) {
    let modal = START_MODAL;
    let peak = START_MODAL;
    let maxDD = 0;
    let trades = 0;
    let wins = 0;

    for (let i = 200; i < candles.length - 1; i++) {
        const signal = analyze(candles.slice(0, i + 1));
        if (signal.direction !== "NEUTRAL" && signal.confidence >= minConf) {
            const entryPrice = candles[i+1].o;
            const tpPct = signal.dynamicTP * tpM;
            const slPct = signal.dynamicSL * slM;
            const tpPx = signal.direction === "LONG" ? entryPrice * (1 + tpPct/100) : entryPrice * (1 - tpPct/100);
            const slPx = signal.direction === "LONG" ? entryPrice * (1 - slPct/100) : entryPrice * (1 + slPct/100);

            const margin = (modal - 0.5) * riskPct;
            if (margin < 0.5 || modal < 1) continue;

            trades++;
            let outcome = null;
            // Scan subsequent candles for TP/SL
            for (let j = i + 1; j < Math.min(i + 150, candles.length); j++) {
                const l = candles[j].l;
                const h = candles[j].h;
                if (signal.direction === "LONG") {
                    if (l <= slPx) { outcome = "SL"; break; }
                    if (h >= tpPx) { outcome = "TP"; break; }
                } else {
                    if (h >= slPx) { outcome = "SL"; break; }
                    if (l <= tpPx) { outcome = "TP"; break; }
                }
            }

            if (!outcome) {
                const exitPx = candles[Math.min(i + 150, candles.length - 1)].c;
                outcome = (signal.direction === "LONG" ? exitPx > entryPrice : exitPx < entryPrice) ? "TP" : "SL";
            }

            const fee = margin * LEVERAGE * 0.0007;
            if (outcome === "TP") {
                modal += (margin * LEVERAGE * (tpPct/100)) - fee;
                wins++;
            } else {
                modal -= (margin * LEVERAGE * (slPct/100)) + fee;
            }

            if (modal > peak) peak = modal;
            const dd = (peak - modal) / peak * 100;
            if (dd > maxDD) maxDD = dd;
            if (modal <= 0.2) return { modal: 0, netProfit: -START_MODAL, winRate: 0, maxDD: 100, trades };
        }
    }

    return { modal, netProfit: modal - START_MODAL, winRate: trades > 0 ? (wins/trades*100) : 0, maxDD, trades };
}

function printElite10(res: any[]) {
    console.log("\n🏆 THE ELITE 10 (Smart Predator Compatible)");
    console.log("═══════════════════════════════════════════════════");
    res.forEach((r, i) => {
        console.log(`${i+1}. ${r.asset.padEnd(6)} | ROI: ${(r.netProfit/START_MODAL*100).toFixed(1)}% | WR: ${r.winRate.toFixed(1)}% | Trades: ${r.trades}`);
    });
    console.log("═══════════════════════════════════════════════════");
    console.log("Recommended Final Assets: [" + res.map(r => r.asset).join(", ") + "]");
}

scan();
