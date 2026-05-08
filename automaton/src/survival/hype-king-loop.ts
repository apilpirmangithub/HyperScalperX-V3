/**
 * HYPE_KING Autonomous Trading Loop — CHAMELEON SNIPER V3 (CLEAN)
 * Refactored to support Multiple Exchanges (Hyperliquid & Binance)
 */

import { Exchange } from "./exchange.js";
import { sendTelegramMessage } from "./telegram.js";
import { analyzeChameleonWick } from "./technicals.js";
import { loadWalletAccount } from "../identity/wallet.js";
import type { AutomatonDatabase } from "../types.js";

// ─── THE CHAMELEON PREDATOR Config 🦎 ───────────────────────
// ─── THE CHAMELEON PREDATOR Config 🦎 ───────────────────────
export const HYPE_KING = {
    ASSETS: ["SOL", "ETH", "BTC", "NEAR", "AVAX", "OP", "ARB", "JTO", "TIA", "SUI", "LINK", "FET", "WLD", "AAVE", "LTC"], 
    predatorLimit: 40,
    marginPortion: 0.40,        
    TRADING_LEVERAGE: 20,       
    MAX_DROP_THRESHOLD: -3.5,   
    autoStopThreshold: 5,       // Jika saldo drop ke $5, bot stop total
    scanInterval: 30 * 1000,    
    orderTimeout: 2 * 60 * 1000,
    trailingStart: 1.5,         
    trailingCallback: 0.5       
};



let predatorAssets: string[] = [...HYPE_KING.ASSETS];

// ─── State ─────────────────────────────────────────────────────
let isRunning = false;
let cycleCount = 0;
let lastSuccessTime = Date.now();
const lastTradeTime: Record<string, number> = {}; 

function log(msg: string) {
    console.log(`[${new Date().toISOString()}] [HYPE_KING] ${msg}`);
}

async function logActivity(db: AutomatonDatabase, type: string, messageEn: string, messageId: string, metadata?: any) {
    try {
        db.insertActivity({
            id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type,
            messageEn,
            messageId,
            timestamp: new Date().toISOString(),
            metadata: metadata ? JSON.stringify(metadata) : undefined
        });
    } catch (err) {
        log(`Failed to log activity: ${err}`);
    }
}

// ─── Main Loop ─────────────────────────────────────────────────

export async function startHypeKingLoop(db: AutomatonDatabase, exchange: Exchange): Promise<void> {
    if (isRunning) return;
    isRunning = true;

    log("═══════════════════════════════════════════════════");
    log(`👑 HYPE_KING CHAMELEON V3 (CLEAN) - Running on ${exchange.name}`);
    log("═══════════════════════════════════════════════════");

    await exchange.init();
    exchange.subscribeToPrices(HYPE_KING.ASSETS);

    const startBal = await exchange.getBalance();
    if (startBal) {
        const initialRealized = startBal.totalValue - (startBal.unrealizedPnl || 0);
        (HYPE_KING as any).peakBalance = initialRealized;
        (HYPE_KING as any).autoStopThreshold = initialRealized * 0.50; 
        log(`💰 [Balance] Total: $${startBal.totalValue.toFixed(2)} | Realized: $${initialRealized.toFixed(2)}`);
        log(`🛡️ [Safety] Circuit Breaker at $${(HYPE_KING as any).autoStopThreshold.toFixed(2)}`);
    }

    const updatePredators = async () => {
        try {
            log("🔍 Scanning for High Volume Predators...");
            const sorted = await exchange.getVolumeTop(15);
            
            const blacklist = ["CHIP", "MEGA", "BIO"];
            predatorAssets = sorted.filter(a => !blacklist.includes(a));
            exchange.subscribeToPrices(predatorAssets);
            log(`🎯 Predator List Updated: ${predatorAssets.join(", ")}`);
        } catch (e) {
            log(`⚠️ Scan Failed: ${e}`);
        }
    };

    await updatePredators();
    await reconcilePositions(db, exchange);

    while (isRunning) {
        try {
            cycleCount++;
            if (cycleCount === 1 || cycleCount % 10 === 0) {
                await updatePredators();
                await reconcilePositions(db, exchange); 
            }

            await runCycle(db, exchange);
            lastSuccessTime = Date.now(); 
            
            const openPosCount = (await exchange.getOpenPositions()).length;
            const sleepMs = openPosCount > 0 ? 3000 : 30000;
            await new Promise<void>(resolve => setTimeout(resolve, sleepMs));
        } catch (err: any) {
            log(`⚠️ Loop Error: ${err.message}`);
            await new Promise<void>(resolve => setTimeout(resolve, 30000));
        }
    }
}

async function runCycle(db: AutomatonDatabase, exchange: Exchange): Promise<void> {
    const userAddress = exchange.name === "Binance" ? undefined : loadWalletAccount()?.address;
    if (exchange.name !== "Binance" && !userAddress) return;

    let positions = await exchange.getOpenPositions();
    let openOrders = await exchange.getOpenOrders();

    // 0. Circuit Breaker
    const bal = await exchange.getBalance();
    if (bal && bal.totalValue < (HYPE_KING as any).autoStopThreshold) {
        log(`🚨 CIRCUIT BREAKER TRIGGERED! CLOSING ALL.`);
        for (const pos of positions) await exchange.closePosition(pos.asset, pos.size, pos.side === "SHORT");
        isRunning = false;
        return;
    }

    // 1. Cancel stale orders
    await cancelStaleOrders(db, exchange);

    // 2. Sync external fills
    await syncExternalTrades(db, exchange, userAddress);

    // 3. Monitor open positions
    const openTrades = db.getOpenTrades();
    const exchangeOrders = await exchange.getOpenOrders();

    for (const trade of openTrades) {
        if (trade.status === "open") {
            const pos = positions.find((p: any) => p.asset === trade.market);
            
            if (!pos) {
                db.updateTrade({ id: trade.id, status: "closed", close_time: new Date().toISOString(), close_reason: "exchange_sync" });
            } else {
                const isLong = pos.side === "LONG";
                const mid = await exchange.getMidPrice(pos.asset);
                const pnlPct = ((mid - trade.entry_price) / trade.entry_price * 100) * (isLong ? 1 : -1);
                
                // --- TRAILING STOP LOGIC ---
                const peakPnl = trade.peak_pnl || 0;
                if (pnlPct > peakPnl) {
                    db.updateTrade({ id: trade.id, peak_pnl: pnlPct });
                }

                // Trigger: If profit hit 1.5% and then drops 0.5% from peak
                if (peakPnl >= 1.5 && (peakPnl - pnlPct) >= 0.5) {
                    log(`🔥 Trailing Stop Triggered for ${pos.asset}: Peak ${peakPnl.toFixed(2)}%, Current ${pnlPct.toFixed(2)}%`);
                    await exchange.closePosition(pos.asset, pos.size, !isLong); // Close the position
                    db.updateTrade({ 
                        id: trade.id, 
                        status: "closed", 
                        close_price: mid, 
                        pnl_pct: pnlPct, 
                        close_time: new Date().toISOString(),
                        close_reason: "trailing_stop" 
                    });
                    await sendTelegramMessage(`💰 <b>TRAILING TP: ${pos.asset}</b>\nProfit: ${pnlPct.toFixed(2)}%\nPeak: ${peakPnl.toFixed(2)}%`);
                    continue;
                }

                // Self-Healing SL
                const hasExchangeSL = exchangeOrders.some((o: any) => o.coin === pos.asset && o.reduceOnly === true);

                
                if (!hasExchangeSL) {
                    log(`⚠️ SL missing on exchange for ${pos.asset}, preparing to re-place...`);
                    db.updateTrade({ id: trade.id, tpsl_placed: false });
                    trade.tpsl_placed = false; 
                }


                // Ensure Hard SL is still there (1.3%)
                if (!trade.tpsl_placed) {
                    const tpPrice = isLong ? trade.entry_price * (1 + (trade.dynamic_tp / 100)) : trade.entry_price * (1 - (trade.dynamic_tp / 100));
                    const slPrice = isLong ? trade.entry_price * (1 - (trade.dynamic_sl / 100)) : trade.entry_price * (1 + (trade.dynamic_sl / 100));
                    
                    try {
                        const stale = exchangeOrders.filter((o: any) => o.coin === pos.asset);
                        for (const s of stale) {
                            await exchange.cancelOrder(s.coin, s.oid);
                        }

                        log(`🛡️ Placing Hard TP/SL for ${pos.asset} (TP: ${trade.dynamic_tp}%, SL: ${trade.dynamic_sl}%)...`);
                        const res = await exchange.placeTPSLOrders(pos.asset, pos.size, isLong, tpPrice, slPrice); 
                        if (res.status === "ok") {
                            db.updateTrade({ id: trade.id, tpsl_placed: true, nuclear_sl: slPrice });
                        }
                    } catch (e: any) {
                        log(`❌ TP/SL Placement Failed for ${pos.asset}: ${e.message}`);
                    }
                }
            }
        }
    }

    // 4. Scan for new entries
    if (positions.length === 0) {
        log(`👀 Scanning for Liquidity Wicks...`);
        const candidates: any[] = [];

        for (const asset of predatorAssets) {
            if (openOrders.some((o: any) => o.coin === asset)) continue;


            const candles = await exchange.getCandles(asset, "15m", 150); 
            if (candles.length < 100) continue;

            const sig = analyzeChameleonWick(candles);
            if (sig.direction !== "NEUTRAL") {
                const now = Date.now();
                if (lastTradeTime[asset] && (now - lastTradeTime[asset] < 30 * 60 * 1000)) continue;
                
                candidates.push({ 
                    asset, 
                    direction: sig.direction, 
                    signal: sig,
                    score: Math.abs(sig.zScore || 0) * (sig.volSurge || 1)
                });
            }
        }

        if (candidates.length > 0) {
            const best = candidates.sort((a, b) => b.score - a.score)[0];
            const { asset, direction, signal } = best;
            
            const midPx = await exchange.getMidPrice(asset);
            const margin = (bal.totalValue - 0.5) * HYPE_KING.marginPortion; 
            const sizeAsset = (margin * HYPE_KING.TRADING_LEVERAGE) / midPx;

            log(`🎯 Best Signal Found: ${asset} (Score: ${best.score.toFixed(2)})`);
            const result = await exchange.placeLimitOrder(asset, direction === "LONG", sizeAsset, midPx);
            if (result) {
                log(`🎯 Entry order placed: ${asset} ${direction} @ ${midPx}`);
                db.insertTrade({
                    id: `hk_${Date.now()}`,
                    market: asset,
                    side: direction,
                    leverage: HYPE_KING.TRADING_LEVERAGE,
                    entry_price: midPx,
                    margin_usdc: margin,
                    dynamic_tp: signal.tp,
                    dynamic_sl: signal.sl,
                    status: "open",
                    open_time: new Date().toISOString(),
                    confidence: 100,
                    tpsl_placed: false,
                    tpsl_retries: 0
                });
                await logActivity(db, "ENTRY", `Opened ${direction} ${asset}`, `Entry ${asset}`);
                await sendTelegramMessage(`🚀 <b>OPEN ${direction}: ${asset}</b>\nPrice: ${midPx.toFixed(4)}\nMargin: $${margin.toFixed(2)}`);
            }
        }
    }
}

async function syncExternalTrades(db: AutomatonDatabase, exchange: Exchange, userAddress: string | undefined) {
    const openTrades = db.getOpenTrades();
    if (openTrades.length === 0) return;
    const fills = await exchange.getUserFills(userAddress);
    if (!fills) return;

    for (const trade of openTrades) {
        const tradeOpenTime = new Date(trade.open_time).getTime();
        const matchingFills = fills.filter(f => {
            const fillTime = new Date(f.time).getTime();
            const closedPnl = parseFloat(f.closedPnl || "0");
            return f.coin === trade.market && fillTime > tradeOpenTime && closedPnl !== 0;
        });

        if (matchingFills.length > 0) {
            const latestFill = matchingFills.sort((a,b) => b.time - a.time)[0];
            const pnlUsdc = matchingFills.reduce((sum, f) => sum + parseFloat(f.closedPnl || "0"), 0);
            db.updateTrade({
                id: trade.id,
                status: "closed",
                close_price: parseFloat(latestFill.px),
                pnl_usdc: pnlUsdc,
                pnl_pct: (pnlUsdc / (trade.margin_usdc * trade.leverage)) * 100,
                close_time: new Date(latestFill.time).toISOString(),
                close_reason: "exchange_filled"
            });
            lastTradeTime[trade.market] = Date.now();
        }
    }
}

async function cancelStaleOrders(db: AutomatonDatabase, exchange: Exchange) {
    try {
        const openOrders = await exchange.getOpenOrders();
        const now = Date.now();
        for (const order of openOrders) {
            if (now - (order.timestamp || 0) > HYPE_KING.orderTimeout) {
                if (order.reduceOnly) continue;
                log(`⏰ Canceling stale entry order: ${order.coin}`);
                await exchange.cancelOrder(order.coin, order.oid);
            }
        }
    } catch (e) {}
}

async function reconcilePositions(db: AutomatonDatabase, exchange: Exchange) {
    try {
        const positions = await exchange.getOpenPositions();
        const openTrades = db.getOpenTrades();
        for (const pos of positions) {
            if (pos.size === 0) continue;
            if (!openTrades.some(t => t.market === pos.asset && t.status === "open")) {
                log(`🧩 [Recovery] Adopting ${pos.asset}...`);
                db.insertTrade({
                    id: `hk_rec_${Date.now()}`,
                    market: pos.asset,
                    side: pos.side,
                    leverage: 10,
                    entry_price: pos.entryPrice || 0,
                    margin_usdc: 1,
                    dynamic_tp: 2.5,
                    dynamic_sl: 1.0,
                    status: "open",
                    open_time: new Date().toISOString(),
                    confidence: 50,
                    tpsl_placed: false,
                    tpsl_retries: 0
                });
            }
        }
    } catch (e) {}
}

export async function getBotStats(db: AutomatonDatabase, exchange: Exchange): Promise<string> {
    const bal = await exchange.getBalance();
    const stats = db.getTradeStats();
    return `💰 <b>EQUITY</b>: $${bal.totalValue.toFixed(2)}\n📈 <b>PnL</b>: $${stats.totalPnlUsdc.toFixed(2)}\n🎯 <b>WINRATE</b>: ${stats.winrate.toFixed(1)}%`;
}

export async function getOpenTradesStatus(exchange: Exchange): Promise<string> {
    try {
        const positions = await exchange.getOpenPositions();
        if (positions.length === 0) return "No active positions. Scanning...";
        let report = "";
        for (const p of positions) {
            const mid = await exchange.getMidPrice(p.asset);
            const pnl = ((mid - p.entryPrice) / p.entryPrice * 100) * (p.side === "LONG" ? 1 : -1);
            report += `🔭 ${p.asset} (${p.side})\n  ↳ Entry: ${p.entryPrice.toFixed(4)}\n  ↳ Live: ${mid.toFixed(4)}\n  ↳ PnL: ${pnl >= 0 ? '🟢' : '🔴'} ${pnl.toFixed(2)}%\n\n`;
        }
        return report.trim();
    } catch (err: any) {
        return `⚠️ Error fetching trades: ${err.message}`;
    }
}

export async function stopBot(exchange: Exchange): Promise<void> {
    log("[Telegram] Stopping bot...");
    isRunning = false;
    try {
        const positions = await exchange.getOpenPositions();
        for (const pos of positions) await exchange.closePosition(pos.asset, pos.size, pos.side === "SHORT");
    } catch (e) {}
}
