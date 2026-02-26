/**
 * HyperScalperX Backtesting Engine
 * 
 * Simulates the trading strategy on historical candle data.
 */

import { getCandles } from "./hyperliquid.js";
import { analyze, type Candle } from "./technicals.js";
import fs from "fs";
import path from "path";

export interface BacktestResult {
    totalTrades: number;
    winrate: number;
    totalPnl: number;
    maxDrawdown: number;
    finalBalance: number;
}

import { TAConfig } from "./technicals.js";

const STRATEGY_PROFILES: Record<string, TAConfig> = {
    SNIPER: { scoreThreshold: 45, volumeSurgeThreshold: 1.5, vaPenalty: 0.5 },
    STEADY: { scoreThreshold: 30, volumeSurgeThreshold: 1.1, vaPenalty: 0.8 },
    SCALPER: { scoreThreshold: 20, volumeSurgeThreshold: 1.0, vaPenalty: 0.9 },
    GOLD: { scoreThreshold: 25, volumeSurgeThreshold: 1.05, vaPenalty: 0.85 },
    CHALLENGE_50: { scoreThreshold: 20, volumeSurgeThreshold: 1.0, vaPenalty: 1.0 },
    DYNAMIC: { scoreThreshold: 15, volumeSurgeThreshold: 0.8, vaPenalty: 1.0 },
    HYPE_KING: { scoreThreshold: 10, volumeSurgeThreshold: 0.5, vaPenalty: 1.0 } // HYPE Token Limit Order Config #5
};

/**
 * Runs a backtest with PRE-FETCHED candle data (no API calls).
 * Used by the optimizer to avoid rate limits.
 */
export function runBacktestWithCandles(candles: Candle[], profileName: string, initialCapital: number, customConfig?: TAConfig, customMultiplier?: number, customBaseRisk?: number): BacktestResult | null {
    const config = customConfig || STRATEGY_PROFILES[profileName.toUpperCase()] || STRATEGY_PROFILES.SCALPER;

    if (candles.length < 200) return null;

    let balance = initialCapital;
    const initialBalance = balance;
    let position: { side: "LONG" | "SHORT", entry: number, size: number, sl: number, tp: number, trailPeak: number, timestamp: string } | null = null;
    let trades = 0;
    let wins = 0;
    let maxDrawdown = 0;
    let peakBalance = balance;
    let consecutiveWins = 0;
    let consecutiveLosses = 0;

    for (let i = 200; i < candles.length; i++) {
        const history = candles.slice(i - 200, i + 1);
        const currentCandle = candles[i];
        const currentPrice = currentCandle.c;

        // Manage Open Position
        if (position) {
            let exited = false;
            let pnl = 0;

            if (position.side === "LONG" && currentCandle.l <= position.sl) {
                pnl = (position.sl - position.entry) / position.entry * balance * 20;
                exited = true;
            } else if (position.side === "SHORT" && currentCandle.h >= position.sl) {
                pnl = (position.entry - position.sl) / position.entry * balance * 20;
                exited = true;
            } else if (position.side === "LONG" && currentCandle.h >= position.tp) {
                pnl = (position.tp - position.entry) / position.entry * balance * 20;
                exited = true;
            } else if (position.side === "SHORT" && currentCandle.l <= position.tp) {
                pnl = (position.entry - position.tp) / position.entry * balance * 20;
                exited = true;
            }

            if (!exited) {
                if (position.side === "LONG") {
                    if (currentCandle.h > position.trailPeak) {
                        position.trailPeak = currentCandle.h;
                        const newSl = position.trailPeak * 0.99;
                        if (newSl > position.sl) position.sl = newSl;
                    }
                    if (currentCandle.l <= position.sl) {
                        pnl = (position.sl - position.entry) / position.entry * balance * 20;
                        exited = true;
                    }
                } else {
                    if (currentCandle.l < position.trailPeak) {
                        position.trailPeak = currentCandle.l;
                        const newSl = position.trailPeak * 1.01;
                        if (newSl < position.sl) position.sl = newSl;
                    }
                    if (currentCandle.h >= position.sl) {
                        pnl = (position.entry - position.sl) / position.entry * balance * 20;
                        exited = true;
                    }
                }
            }

            if (exited) {
                balance += pnl;
                trades++;
                if (pnl > 0) { wins++; consecutiveWins++; consecutiveLosses = 0; }
                else { consecutiveWins = 0; consecutiveLosses++; }
                if (balance > peakBalance) peakBalance = balance;
                const dd = (peakBalance - balance) / peakBalance * 100;
                if (dd > maxDrawdown) maxDrawdown = dd;
                position = null;
            }
        }

        // Scan for New Entry
        if (!position && balance > 0.5) {
            const signal = analyze(history, 0, config);
            if (signal.confidence >= config.scoreThreshold && signal.direction !== "NEUTRAL") {
                const slPct = signal.dynamicSL / 100;
                const tpPct = signal.dynamicTP / 100;
                const timestamp = new Date(currentCandle.t).toISOString();

                const isChallenge = true; // Always use compounding in optimizer
                const baseRisk = customBaseRisk !== undefined ? customBaseRisk : 0.4;
                const streakMulti = customMultiplier !== undefined ? customMultiplier : 0.2;
                const streakMultiplier = Math.min(2.0, 1.0 + (consecutiveWins * streakMulti));
                const riskFraction = Math.min(0.8, baseRisk * streakMultiplier);

                position = {
                    side: signal.direction as "LONG" | "SHORT",
                    entry: currentPrice,
                    size: balance * riskFraction * 20,
                    sl: signal.direction === "LONG" ? currentPrice * (1 - slPct) : currentPrice * (1 + slPct),
                    tp: signal.direction === "LONG" ? currentPrice * (1 + tpPct) : currentPrice * (1 - tpPct),
                    trailPeak: currentPrice,
                    timestamp
                };
            }
        }
    }

    const totalPnl = ((balance - initialBalance) / initialBalance) * 100;
    const winrate = trades > 0 ? (wins / trades) * 100 : 0;

    return { totalTrades: trades, winrate, totalPnl, maxDrawdown, finalBalance: balance };
}

/**
 * Runs a backtest simulation for a specific asset and strategy profile.
 */
export async function runBacktest(asset: string = "ETH", days: number = 30, profileName: string = "SCALPER", initialCapital: number = 8, customConfig?: TAConfig, customMultiplier?: number, customBaseRisk?: number, offsetDays: number = 0): Promise<BacktestResult | null> {
    const config = customConfig || STRATEGY_PROFILES[profileName.toUpperCase()] || STRATEGY_PROFILES.SCALPER;
    console.log(`\n=== 📊 BACKTEST START: ${asset} (${days} days) ===`);

    const interval = "5m";
    const candlesPerDay = (24 * 60) / 5;
    const totalCandles = Math.floor(days * candlesPerDay);

    console.log(`[Backtest] Fetching ${totalCandles} historical candles...`);

    // Hyperliquid API limit is ~5000 candles per request.
    // Calculate end time
    const endTime = Date.now() - (offsetDays * 24 * 60 * 60 * 1000);
    console.log(`[Backtest] Offset: ${offsetDays} days. End time set to: ${new Date(endTime).toISOString()}`);
    const candles = await getCandles(asset, interval, totalCandles, endTime);
    console.log(`[Backtest] Fetched ${candles.length} candles from Hyperliquid limit 5000`);

    if (candles.length < 200) {
        console.error("Not enough data to run backtest (need at least 200 candles for EMA200).");
        return null;
    }

    let balance = initialCapital;
    const initialBalance = balance;
    let position: { side: "LONG" | "SHORT", entry: number, size: number, sl: number, tp: number, trailPeak: number, timestamp: string } | null = null;
    let trades = 0;
    let wins = 0;
    let maxDrawdown = 0;
    let peakBalance = balance;

    const tradeLogs: string[] = ["Timestamp,Action,Price,Balance,PnL%,Result"];
    const balanceHistory: string[] = ["Timestamp,Balance"];

    // Simulation Loop (Start from candle 200 to have enough history for indicators)
    let consecutiveWins = 0;
    let consecutiveLosses = 0;

    for (let i = 200; i < candles.length; i++) {
        const history = candles.slice(i - 200, i + 1);
        const currentCandle = candles[i];
        const currentPrice = currentCandle.c;

        // 1. Manage Open Position
        if (position) {
            let exited = false;
            let pnl = 0;

            // Check SL
            if (position.side === "LONG" && currentCandle.l <= position.sl) {
                pnl = (position.sl - position.entry) / position.entry * balance * 20; // 20x leverage
                exited = true;
            } else if (position.side === "SHORT" && currentCandle.h >= position.sl) {
                pnl = (position.entry - position.sl) / position.entry * balance * 20;
                exited = true;
            }
            // Check TP
            else if (position.side === "LONG" && currentCandle.h >= position.tp) {
                pnl = (position.tp - position.entry) / position.entry * balance * 20;
                exited = true;
            } else if (position.side === "SHORT" && currentCandle.l <= position.tp) {
                pnl = (position.entry - position.tp) / position.entry * balance * 20;
                exited = true;
            }

            // Trailing Stop Logic (Simplified)
            if (!exited) {
                if (position.side === "LONG") {
                    if (currentCandle.h > position.trailPeak) {
                        position.trailPeak = currentCandle.h;
                        // Move SL up
                        const newSl = position.trailPeak * 0.99; // 1% trail
                        if (newSl > position.sl) position.sl = newSl;
                    }
                    if (currentCandle.l <= position.sl) {
                        pnl = (position.sl - position.entry) / position.entry * balance * 20;
                        exited = true;
                    }
                } else {
                    if (currentCandle.l < position.trailPeak) {
                        position.trailPeak = currentCandle.l;
                        const newSl = position.trailPeak * 1.01;
                        if (newSl < position.sl) position.sl = newSl;
                    }
                    if (currentCandle.h >= position.sl) {
                        pnl = (position.entry - position.sl) / position.entry * balance * 20;
                        exited = true;
                    }
                }
            }

            if (exited) {
                const pnlPct = (pnl / (position.size / 20)) * 100;
                balance += pnl;
                trades++;
                if (pnl > 0) {
                    wins++;
                    consecutiveWins++;
                    consecutiveLosses = 0;
                } else {
                    consecutiveWins = 0;
                    consecutiveLosses++;
                }

                tradeLogs.push(`${new Date(currentCandle.t).toISOString()},EXIT_${position.side},${currentPrice.toFixed(4)},${balance.toFixed(2)},${pnlPct.toFixed(2)}%,${pnl > 0 ? "WIN" : "LOSS"}`);
                console.log(`[EXIT] ${new Date(currentCandle.t).toISOString()} | ${position.side} | PnL: $${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%) | Balance: $${balance.toFixed(2)} (Streak: ${consecutiveWins})`);

                if (balance > peakBalance) peakBalance = balance;
                const dd = (peakBalance - balance) / peakBalance * 100;
                if (dd > maxDrawdown) maxDrawdown = dd;

                position = null;
            }
        }

        balanceHistory.push(`${new Date(currentCandle.t).toISOString()},${balance.toFixed(2)}`);

        // 2. Scan for New Entry (Only if no position)
        if (!position && balance > 0.5) {
            const signal = analyze(history, 0, config);

            // Debug: Show high-ish signals every 100 candles to see progression
            if (signal.confidence > 50 && i % 100 === 0) {
                console.log(`[Debug] Candle ${i}: Signal ${signal.direction} Confidence ${signal.confidence.toFixed(1)}%`);
            }

            // HIGH FREQUENCY: Standardized threshold
            if (signal.confidence >= config.scoreThreshold && signal.direction !== "NEUTRAL") {
                const timestamp = new Date(currentCandle.t).toISOString();

                // ═══════════════════════════════════════════════════════
                // DYNAMIC STRATEGY: Regime-Aware Adaptive Logic
                // ═══════════════════════════════════════════════════════
                const isDynamic = profileName === "DYNAMIC";

                let slPct: number;
                let tpPct: number;
                let riskFraction: number;

                if (isDynamic) {
                    // --- COOLDOWN v2: Only after 5+ losses, and easier to break ---
                    if (consecutiveLosses >= 5) {
                        if (signal.confidence < 40) continue;
                        console.log(`[DYNAMIC] Cooldown broken by signal (${signal.confidence.toFixed(0)}%)`);
                    }

                    // --- REGIME DETECTION ---
                    const vpPos = signal.volumeProfile?.position || "INSIDE_VA";
                    const atrPct = signal.indicators?.atrPct || 0.5;
                    const isBreakout = vpPos !== "INSIDE_VA";
                    const isHighVol = atrPct > 0.4; // Lowered from 0.6

                    // --- ADAPTIVE RISK v2 (More Aggressive) ---
                    let dynamicBaseRisk: number;

                    if (isBreakout && isHighVol) {
                        dynamicBaseRisk = 0.55; // TRENDING: Max aggression
                    } else if (isBreakout) {
                        dynamicBaseRisk = 0.45; // Mild breakout
                    } else if (isHighVol) {
                        dynamicBaseRisk = 0.25; // Choppy but volatile
                    } else {
                        dynamicBaseRisk = 0.30; // Range bound, medium risk
                    }

                    // Confidence multiplier: 0.6x at conf=15 → 1.5x at conf=80+
                    const confMulti = Math.min(1.5, 0.6 + (signal.confidence / 120));
                    riskFraction = dynamicBaseRisk * confMulti;

                    // Streak bonus: +15% per win, max 2x
                    const streakBonus = Math.min(2.0, 1.0 + (consecutiveWins * 0.15));
                    riskFraction *= streakBonus;

                    // Loss dampener: gentle reduction
                    if (consecutiveLosses > 0) {
                        riskFraction *= Math.max(0.4, 1.0 - (consecutiveLosses * 0.12));
                    }

                    // Cap at 70%
                    riskFraction = Math.min(0.7, riskFraction);

                    // --- ADAPTIVE TP/SL v2 ---
                    if (isBreakout) {
                        // Trending: Wide TP, tight SL → great R:R
                        tpPct = signal.dynamicTP * 2.0 / 100;
                        slPct = signal.dynamicSL * 0.6 / 100;
                    } else {
                        // Range: Quick TP, wider SL to survive noise
                        tpPct = signal.dynamicTP * 1.2 / 100;
                        slPct = signal.dynamicSL * 1.0 / 100;
                    }

                    console.log(`[DYNAMIC] ${vpPos} | ATR ${(atrPct).toFixed(2)}% | Risk ${(riskFraction * 100).toFixed(0)}% | TP ${(tpPct * 100).toFixed(2)}% | SL ${(slPct * 100).toFixed(2)}% | Streak W${consecutiveWins}/L${consecutiveLosses}`);

                } else {
                    // Non-DYNAMIC profiles: Original fixed logic
                    slPct = signal.dynamicSL / 100;
                    tpPct = signal.dynamicTP / 100;

                    const isChallenge = profileName === "GOLD" || profileName === "CHALLENGE_50";
                    const baseRisk = customBaseRisk !== undefined ? customBaseRisk : 0.4;
                    const streakMulti = customMultiplier !== undefined ? customMultiplier : (profileName === "CHALLENGE_50" ? 0.1 : 0.2);
                    const streakMultiplier = isChallenge || customConfig ? Math.min(2.0, 1.0 + (consecutiveWins * streakMulti)) : 1.0;
                    riskFraction = isChallenge || customConfig ? baseRisk * streakMultiplier : baseRisk;
                }

                console.log(`[ENTRY] ${timestamp} | ${signal.direction} | Price: ${currentPrice.toFixed(4)} | Confidence: ${signal.confidence.toFixed(1)}%`);
                tradeLogs.push(`${timestamp},ENTRY_${signal.direction},${currentPrice.toFixed(4)},${balance.toFixed(2)},0,PENDING`);

                position = {
                    side: signal.direction as "LONG" | "SHORT",
                    entry: currentPrice,
                    size: balance * riskFraction * 20, // COMPOUNDING: Uses current balance
                    sl: signal.direction === "LONG" ? currentPrice * (1 - slPct) : currentPrice * (1 + slPct),
                    tp: signal.direction === "LONG" ? currentPrice * (1 + tpPct) : currentPrice * (1 - tpPct),
                    trailPeak: currentPrice,
                    timestamp
                };
            }
        }
    }

    const totalPnl = ((balance - initialBalance) / initialBalance) * 100;
    const winrate = trades > 0 ? (wins / trades) * 100 : 0;

    // Export to CSV
    const csvPath = path.join(process.cwd(), `backtest_${asset}_${days}d.csv`);
    fs.writeFileSync(csvPath, tradeLogs.join("\n") + "\n\nBALANCE HISTORY\n" + balanceHistory.join("\n"));
    console.log(`\n[Export] Detailed CSV report saved to: ${csvPath}`);

    const summary = `
=== 📉 BACKTEST RESULTS: ${asset} ===
Initial Balance: $${initialBalance.toFixed(2)}
Final Balance:   $${balance.toFixed(2)}
Total PnL:       ${totalPnl.toFixed(2)}%
Total Trades:    ${trades}
Winrate:         ${winrate.toFixed(2)}%
Max Drawdown:    ${maxDrawdown.toFixed(2)}%
===================================
`;
    console.log(summary);
    fs.appendFileSync(path.join(process.cwd(), "backtest_summary.txt"), summary);

    return {
        totalTrades: trades,
        winrate,
        totalPnl,
        maxDrawdown,
        finalBalance: balance
    };
}
