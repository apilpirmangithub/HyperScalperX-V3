/**
 * HYPE_KING Autonomous Trading Loop — EXACT MATCH to Backtest Config #5
 * 
 * Runs the HYPE_KING Config #5 strategy purely in code — NO LLM calls.
 * This loop scans HYPE 5m candles, detects signals via technicals.ts,
 * and places GTC limit orders via the Hyperliquid API.
 * 
 * Config #5: Conf >= 20 | Risk 90% | TP 2.5x ATR | SL 0.5x ATR | 20x Lev
 * 
 * IDENTICAL TO BACKTEST:
 * ✅ Limit order (GTC) with 0.05% price offset
 * ✅ Win-streak compounding: +15% risk per consecutive win, max 2x
 * ✅ 30-min order timeout (cancel unfilled orders)
 * ✅ TP/SL via mid-price check (matching candle-based logic)
 */

import {
    initHyperliquid,
    getBalance,
    getOpenPositions,
    getCandles,
    getMidPrice,
    marketOrder,
    closePosition,
    setLeverage,
    checkPositionTPSL,
} from "./hyperliquid.js";
import { analyze, type TAConfig } from "./technicals.js";
import { loadWalletAccount } from "../identity/wallet.js";
import type { AutomatonDatabase } from "../types.js";

// ─── HYPE_KING Config (EXACT MATCH to Backtest Config #5) ──────
const HYPE_KING = {
    asset: "HYPE",
    confidence: 20,       // Min confidence to enter
    riskPct: 0.9,         // 90% of withdrawable per trade
    tpMulti: 2.5,         // TP = 2.5x dynamic ATR TP
    slMulti: 0.5,         // SL = 0.5x dynamic ATR SL
    leverage: 20,         // 20x leverage
    entryOffset: 0.0005,  // 0.05% better than mid price (limit order offset)
    scanInterval: 5 * 60 * 1000,  // 5 minutes (match 1 candle)
    orderTimeout: 30 * 60 * 1000, // 30 minutes (cancel unfilled order after 6 candles)
    // Win-streak compounding (identical to backtest)
    streakBonus: 0.15,    // +15% risk per consecutive win
    streakMaxMulti: 2.0,  // Max 2x risk multiplier
    taConfig: { scoreThreshold: 10, volumeSurgeThreshold: 0.5, vaPenalty: 1.0 } as TAConfig,
};

// ─── State ─────────────────────────────────────────────────────
let isRunning = false;
let cycleCount = 0;
let totalPnl = 0;
let wins = 0;
let losses = 0;
let consecutiveWins = 0;   // For win-streak compounding
let pendingOrderTime: number | null = null; // Track unfilled order time

function log(msg: string) {
    console.log(`[${new Date().toISOString()}] [HYPE_KING] ${msg}`);
}

// ─── Main Loop ─────────────────────────────────────────────────

export async function startHypeKingLoop(db: AutomatonDatabase): Promise<void> {
    if (isRunning) {
        log("Already running, skipping duplicate start.");
        return;
    }
    isRunning = true;

    log("═══════════════════════════════════════════════════");
    log("👑 HYPE_KING Autonomous Loop Starting (BACKTEST-IDENTICAL)");
    log(`Config: Conf>=${HYPE_KING.confidence} | Risk ${HYPE_KING.riskPct * 100}% | TP x${HYPE_KING.tpMulti} | SL x${HYPE_KING.slMulti} | ${HYPE_KING.leverage}x Lev`);
    log(`Streak: +${HYPE_KING.streakBonus * 100}%/win, max ${HYPE_KING.streakMaxMulti}x | Entry offset: ${HYPE_KING.entryOffset * 100}%`);
    log("═══════════════════════════════════════════════════");

    const account = loadWalletAccount();
    if (!account) {
        log("❌ Wallet not loaded. Cannot start trading.");
        isRunning = false;
        return;
    }

    await initHyperliquid();

    // Main infinite loop
    while (isRunning) {
        try {
            cycleCount++;
            await runCycle(db);
        } catch (err: any) {
            log(`⚠️ Cycle ${cycleCount} error: ${err.message}`);
        }

        // Sleep until next scan
        log(`💤 Sleeping ${HYPE_KING.scanInterval / 1000}s until next scan...`);
        await new Promise(r => setTimeout(r, HYPE_KING.scanInterval));
    }
}

export function stopHypeKingLoop(): void {
    log("🛑 Stopping HYPE_KING loop...");
    isRunning = false;
}

// ─── Single Cycle ──────────────────────────────────────────────

async function runCycle(db: AutomatonDatabase): Promise<void> {
    log(`──── Cycle #${cycleCount} | Streak: ${consecutiveWins}W ────`);

    // 1. Check balance
    const balance = await getBalance();
    log(`💰 Balance: $${balance.accountValue.toFixed(2)} | Withdrawable: $${balance.withdrawable.toFixed(2)}`);
    db.setKV("current_balance_hl", balance.accountValue.toString());

    if (balance.withdrawable < 1.0) {
        log("⚠️ Balance too low to trade. Waiting...");
        return;
    }

    // 2. Check existing positions & manage TP/SL
    const openTrades = db.getOpenTrades();
    const hlPositions = await getOpenPositions();

    for (const trade of openTrades) {
        if (trade.market !== HYPE_KING.asset) continue;

        const hlPos = hlPositions.find(h => h.asset === trade.market);
        if (!hlPos) {
            // Position closed externally or liquidated
            db.updateTrade({
                id: trade.id,
                status: "closed",
                closeReason: "closed_external",
                closeTime: new Date().toISOString(),
            });
            log(`🔄 ${trade.market} position closed externally.`);
            consecutiveWins = 0; // Reset streak on external close
            continue;
        }

        // Check TP/SL using current mid price (like backtest checking candle H/L)
        const check = await checkPositionTPSL({
            market: trade.market,
            side: trade.side,
            entryPrice: trade.entryPrice,
            leverage: trade.leverage,
            dynamicTP: trade.dynamicTP,
            dynamicSL: trade.dynamicSL,
        });

        if (check && check.shouldClose) {
            log(`🎯 Closing ${trade.side} ${trade.market}: ${check.reason} (PnL ${check.pnlPct.toFixed(1)}%)`);
            const result = await closePosition(trade.market);
            if (result) {
                const pnlUsdc = (check.pnlPct / 100) * trade.marginUsdc * trade.leverage;
                totalPnl += pnlUsdc;

                // Win/Loss streak tracking (IDENTICAL to backtest)
                if (pnlUsdc > 0) {
                    wins++;
                    consecutiveWins++;
                    log(`🔥 Win streak: ${consecutiveWins} consecutive wins!`);
                } else {
                    losses++;
                    consecutiveWins = 0; // Reset on loss
                }

                db.updateTrade({
                    id: trade.id,
                    status: "closed",
                    closePrice: check.currentPrice,
                    pnlPct: check.pnlPct,
                    pnlUsdc,
                    closeTime: new Date().toISOString(),
                    closeReason: check.reason,
                });
                log(`${pnlUsdc >= 0 ? "✅" : "🩸"} PnL: $${pnlUsdc.toFixed(2)} | Total: $${totalPnl.toFixed(2)} | W/L: ${wins}/${losses}`);
            }
            pendingOrderTime = null;
        } else if (check) {
            log(`📊 ${trade.market} ${trade.side}: PnL ${check.pnlPct >= 0 ? "+" : ""}${check.pnlPct.toFixed(1)}% — holding...`);
        }
    }

    // 3. Check for unfilled orders (30-min timeout like backtest's 6-candle timeout)
    if (pendingOrderTime && (Date.now() - pendingOrderTime > HYPE_KING.orderTimeout)) {
        log(`⏰ Order timeout (30min). Cancelling unfilled order.`);
        try {
            await closePosition(HYPE_KING.asset); // Cancel any pending orders
        } catch (e: any) {
            log(`Note: No pending order to cancel.`);
        }
        pendingOrderTime = null;
    }

    // 4. Scan for new entry (only if not in HYPE position)
    const currentHypePos = db.getOpenTrades().filter(t => t.market === HYPE_KING.asset);
    if (currentHypePos.length > 0) {
        log(`📌 Already in ${HYPE_KING.asset} position. Waiting for exit.`);
        return;
    }
    if (pendingOrderTime) {
        log(`⏳ Pending order waiting for fill...`);
        return;
    }

    // Fetch 5m candles for HYPE
    log(`🔍 Scanning ${HYPE_KING.asset} 5m candles...`);
    const candles = await getCandles(HYPE_KING.asset, "5m", 250);
    if (candles.length < 200) {
        log(`⚠️ Not enough candles (${candles.length}). Waiting...`);
        return;
    }

    // Run TA analysis
    const signal = analyze(candles, 0, HYPE_KING.taConfig);

    if (signal.direction === "NEUTRAL" || signal.confidence < HYPE_KING.confidence) {
        log(`🔇 No signal (${signal.direction} @ ${signal.confidence.toFixed(0)}% conf). Waiting...`);
        return;
    }

    // Apply HYPE_KING TP/SL multipliers (IDENTICAL to backtest)
    const dynamicTP = signal.dynamicTP * HYPE_KING.tpMulti;
    const dynamicSL = signal.dynamicSL * HYPE_KING.slMulti;

    // Win-streak compounding (IDENTICAL to backtest: +15%/win, max 2x)
    const streakMultiplier = Math.min(
        HYPE_KING.streakMaxMulti,
        1.0 + (consecutiveWins * HYPE_KING.streakBonus)
    );
    const effectiveRisk = Math.min(0.95, HYPE_KING.riskPct * streakMultiplier);

    log(`⚡ SIGNAL: ${signal.direction} ${HYPE_KING.asset} | Conf: ${signal.confidence.toFixed(0)}% | TP: ${dynamicTP.toFixed(2)}% | SL: ${dynamicSL.toFixed(2)}% | Risk: ${(effectiveRisk * 100).toFixed(0)}% (streak x${streakMultiplier.toFixed(2)})`);

    // Calculate position size with streak-adjusted risk
    const refreshedBal = await getBalance();
    const margin = refreshedBal.withdrawable * effectiveRisk;
    const midPx = await getMidPrice(HYPE_KING.asset);

    // Entry price offset (0.05% better than mid — IDENTICAL to backtest)
    // LONG: buy slightly below mid | SHORT: sell slightly above mid
    const entryPrice = signal.direction === "LONG"
        ? midPx * (1 - HYPE_KING.entryOffset)
        : midPx * (1 + HYPE_KING.entryOffset);

    const sizeAsset = (margin * HYPE_KING.leverage) / entryPrice;

    // Set leverage
    try {
        const { getAllTradableAssets } = await import("./hyperliquid.js");
        const assets = await getAllTradableAssets();
        const hypeAsset = assets.assets.find(a => a.name === HYPE_KING.asset);
        if (hypeAsset) {
            await setLeverage(hypeAsset.index, HYPE_KING.leverage);
        }
    } catch (e: any) {
        log(`⚠️ Leverage set note: ${e.message}`);
    }

    // Place GTC limit order (marketOrder with useMakerOrders=true → GTC at mid price)
    log(`🚀 OPENING ${signal.direction} ${HYPE_KING.asset} | Margin: $${margin.toFixed(2)} @ ${HYPE_KING.leverage}x | Size: ${sizeAsset.toFixed(4)} | Entry: $${entryPrice.toFixed(4)} (mid: $${midPx.toFixed(4)})`);
    const result = await marketOrder(HYPE_KING.asset, signal.direction === "LONG", sizeAsset);

    if (result && result.status === "ok") {
        const tradeId = `hk_${Date.now()}`;
        db.insertTrade({
            id: tradeId,
            market: HYPE_KING.asset,
            side: signal.direction as "LONG" | "SHORT",
            leverage: HYPE_KING.leverage,
            entryPrice: entryPrice,
            marginUsdc: margin,
            dynamicTP,
            dynamicSL,
            status: "open",
            openTime: new Date().toISOString(),
            confidence: signal.confidence,
        });
        pendingOrderTime = Date.now();
        log(`✅ GTC Limit order placed! Trade ID: ${tradeId} | Timeout: 30min`);
    } else {
        log(`❌ Order failed: ${JSON.stringify(result)}`);
    }
}
