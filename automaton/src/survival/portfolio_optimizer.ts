/**
 * PORTFOLIO OPTIMIZER — Mencari settingan "Jackpot" di banyak koin sekaligus.
 */
import ccxt from "ccxt";
import { analyzeChameleonWick, setStrategyConfig } from "./technicals.js";

async function optimizePortfolio() {
    const binance = new ccxt.binance({ options: { defaultType: 'future' } });
    const assets = ["SOL", "ETH", "BTC", "NEAR", "AVAX", "OP", "ARB", "JTO", "TIA", "SUI", "LINK", "FET", "WLD", "AAVE", "LTC"];
    const days = 15;
    
    console.log("📡 Fetching historical data for all assets...");
    const allData: any = {};
    for (const asset of assets) {
        const candles = await binance.fetchOHLCV(`${asset}/USDT:USDT`, "15m", undefined, 96 * days);
        allData[asset] = candles.map(c => ({ t: c[0], o: c[1], h: c[2], l: c[3], c: c[4], v: c[5] }));
    }

    const zRange = [2.2, 2.4, 2.5, 2.6, 2.8];
    const wickRange = [0.05, 0.1, 0.15];
    const tpRange = [1.0, 1.2, 1.5];
    const slRange = [0.8, 1.0];

    let bestResult = { profit: -999, config: {} };

    console.log("\n🚀 STARTING BRUTE-FORCE OPTIMIZATION...");
    
    for (const z of zRange) {
        for (const wick of wickRange) {
            for (const tp of tpRange) {
                for (const sl of slRange) {
                    setStrategyConfig({ zThreshold: z, wickThreshold: wick, tp, sl });
                    
                    let balance = 1000;
                    let openTrade: any = null;
                    let trades = 0;

                    for (let i = 100; i < allData[assets[0]].length; i++) {
                        if (openTrade) {
                            const cur = allData[openTrade.asset][i];
                            const isLong = openTrade.side === "LONG";
                            const highChg = ((cur.h - openTrade.entry) / openTrade.entry) * 100 * (isLong ? 1 : -1);
                            const lowChg = ((cur.l - openTrade.entry) / openTrade.entry) * 100 * (isLong ? 1 : -1);

                            if (highChg >= tp) {
                                balance += balance * 0.40 * 20 * (tp/100);
                                openTrade = null;
                            } else if (lowChg <= -sl) {
                                balance += balance * 0.40 * 20 * (-sl/100);
                                openTrade = null;
                            }
                            continue;
                        }

                        const candidates: any[] = [];
                        for (const asset of assets) {
                            const sig = analyzeChameleonWick(allData[asset].slice(i - 100, i));
                            if (sig.direction !== "NEUTRAL") {
                                candidates.push({ asset, side: sig.direction, entry: allData[asset][i].o, score: Math.abs(sig.zScore || 0) });
                            }
                        }

                        if (candidates.length > 0) {
                            openTrade = candidates.sort((a, b) => b.score - a.score)[0];
                            trades++;
                        }
                    }

                    const profit = ((balance - 1000) / 1000) * 100;
                    if (profit > bestResult.profit) {
                        bestResult = { profit, config: { z, wick, tp, sl, trades } };
                        console.log(`✨ New Best: ${profit.toFixed(2)}% | Z:${z} W:${wick} TP:${tp} SL:${sl} (Trades: ${trades})`);
                    }
                }
            }
        }
    }

    console.log("\n🏆 OPTIMIZATION COMPLETE!");
    console.log("─────────────────────────────────────────");
    console.log(`BEST PROFIT: ${bestResult.profit.toFixed(2)}%`);
    console.log(`CONFIG:`, bestResult.config);
    console.log("─────────────────────────────────────────");
}

optimizePortfolio().catch(console.error);
