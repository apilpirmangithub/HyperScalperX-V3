/**
 * Hyperliquid Perpetual Trading Integration (CLEAN BUILD)
 * 
 * Simplified and optimized for HyperScalperX.
 * Property names aligned with snake_case database schema.
 */

import {
    InfoClient,
    ExchangeClient,
    HttpTransport,
    SubscriptionClient,
    WebSocketTransport
} from "@nktkas/hyperliquid";
import { PrivateKeySigner } from "@nktkas/hyperliquid/signing";
import { loadWalletAccount, getWalletPrivateKey, getSigningAddress, getMainWalletAddress } from "../identity/wallet.js";
import { type Candle } from "./technicals.js";
// @ts-ignore - ws has no bundled types in this project
import WebSocket from "ws";

// Polyfill for ws to support dispatchEvent (needed by @nktkas/rews in Node.js)
if (WebSocket.prototype && !WebSocket.prototype.dispatchEvent) {
    WebSocket.prototype.dispatchEvent = function (event: any) {
        return this.emit(event.type, event);
    };
}

import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 200; // Increase default limit to avoid warnings on WS L2Book listeners


export async function safeRequest<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
        const result = await fn();
        clearTimeout(timeoutId);
        return result;
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error("Hyperliquid request timed out after 15s");
        const status = err.status || err.statusCode || (err.response && err.response.status);
        if (status === 429 && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return safeRequest(fn, retries - 1, delay * 2);
        }
        throw err;
    }
}

const IS_TESTNET = false;

let infoClient: InfoClient | null = null;
let exchangeClient: ExchangeClient | null = null;
let wsClient: SubscriptionClient | null = null;
const priceCache: Record<string, { price: number, ts: number }> = {};
const subscribedAssets = new Set<string>();

export function initHyperliquid() {
    if (infoClient && exchangeClient && wsClient) return { infoClient, exchangeClient, wsClient };
    
    const privateKey = getWalletPrivateKey();
    if (!privateKey) throw new Error("No private key found.");
    
    const transport = new HttpTransport({ isTestnet: IS_TESTNET });
    infoClient = new InfoClient({ transport });
    
    const signer = new PrivateKeySigner(privateKey as `0x${string}`);
    exchangeClient = new ExchangeClient({ wallet: signer, transport, isTestnet: IS_TESTNET });
    
    const wsTransport = new WebSocketTransport({ 
        url: IS_TESTNET ? "wss://api.hyperliquid-testnet.xyz/ws" : "wss://api.hyperliquid.xyz/ws",
        reconnect: { WebSocket: WebSocket as any }
    });
    wsClient = new SubscriptionClient({ transport: wsTransport });

    return { infoClient, exchangeClient, wsClient };
}

export function subscribeToPrices(assets: string[]) {
    initHyperliquid();
    if (!wsClient) throw new Error("WebSocket not initialized");
    
    let newSubs = false;
    assets.forEach(asset => {
        if (!subscribedAssets.has(asset)) {
            wsClient!.l2Book({ coin: asset }, (data: any) => {
                if (data.levels[0][0] && data.levels[1][0]) {
                    const bestBid = parseFloat(data.levels[0][0].px);
                    const bestAsk = parseFloat(data.levels[1][0].px);
                    priceCache[asset] = { price: (bestBid + bestAsk) / 2, ts: Date.now() };
                }
            });
            subscribedAssets.add(asset);
            newSubs = true;
        }
    });
    
    if (newSubs) {
        console.log(`📡 WebSocket Subscribed to: ${assets.join(", ")}`);
    }
}

export function getCachedPrice(asset: string): number | null {
    const entry = priceCache[asset];
    if (entry && Date.now() - entry.ts < 5000) {
        return entry.price;
    }
    return null;
}

export async function getBalance() {
    const { infoClient } = initHyperliquid();
    const address = getMainWalletAddress();
    if (!address) throw new Error("Wallet not loaded");
    
    // Fetch both states
    const [perpData, spotData] = await Promise.all([
        safeRequest(() => infoClient!.clearinghouseState({ user: address as `0x${string}` })),
        safeRequest(() => infoClient!.spotClearinghouseState({ user: address as `0x${string}` }))
    ]) as [any, any];

    // 1. Calculate Spot Value (Cash + Spot Assets)
    let totalSpotValue = 0;
    if (spotData && spotData.balances) {
        for (const b of spotData.balances) {
            const amount = parseFloat(b.total);
            if (b.coin === "USDC") {
                totalSpotValue += amount; // USDC is 1:1
            } else {
                const price = getCachedPrice(b.coin) || 0;
                totalSpotValue += amount * price;
            }
        }
    }

    // 2. Calculate Perp Unrealized PnL
    let totalUnrealizedPnl = 0;
    if (perpData.assetPositions) {
        perpData.assetPositions.forEach((p: any) => {
            const rawPos = p.position || p;
            totalUnrealizedPnl += parseFloat(rawPos.unrealizedPnl || "0");
        });
    }

    // 3. Total Equity = Total Cash/Spot + Perp PnL
    const totalEquity = totalSpotValue + totalUnrealizedPnl;
    
    const marginSummary = perpData.marginSummary || perpData.crossMarginSummary || {};

    return {
        totalValue: totalEquity,
        accountValue: totalEquity,
        spotValue: totalSpotValue,
        withdrawable: parseFloat(perpData.withdrawable || "0"),
        marginUsed: parseFloat(marginSummary.marginUsed || marginSummary.totalMarginUsed || "0"),
        unrealizedPnl: totalUnrealizedPnl
    };
}

export async function getMidPrice(symbol: string) {
    const { infoClient } = initHyperliquid();
    const allMids = await safeRequest(() => infoClient.allMids()) as Record<string, string>;
    const mid = allMids[symbol];
    if (!mid) throw new Error(`Price not found for ${symbol}`);
    return parseFloat(mid);
}

export async function getSpread(asset: string): Promise<{ bid: number, ask: number, spreadPct: number }> {
    const { infoClient } = initHyperliquid();
    const book = await safeRequest(() => infoClient.l2Book({ coin: asset })) as any;
    if (!book.levels[0][0] || !book.levels[1][0]) {
        throw new Error(`Order book empty for ${asset}`);
    }
    const bestBid = parseFloat(book.levels[0][0].px);
    const bestAsk = parseFloat(book.levels[1][0].px);
    const spreadPct = ((bestAsk - bestBid) / bestBid) * 100;
    return { bid: bestBid, ask: bestAsk, spreadPct };
}

export async function getOpenPositions() {
    const { infoClient } = initHyperliquid();
    const address = getMainWalletAddress();
    if (!address) return [];
    
    const data = await safeRequest(() => infoClient!.clearinghouseState({ user: address as `0x${string}` })) as any;
    if (!data || !data.assetPositions) return [];

    return data.assetPositions
        .map((p: any) => {
            const rawPos = p.position || p;
            const sizeStr = rawPos.szi || rawPos.s || rawPos.sz || "0";
            const size = parseFloat(sizeStr);
            if (size === 0) return null;

            return {
                asset: rawPos.coin || rawPos.asset || "UNKNOWN",
                side: size > 0 ? "LONG" : "SHORT" as "LONG" | "SHORT",
                size: Math.abs(size),
                entryPrice: parseFloat(rawPos.entryPx || rawPos.entryPrice || "0"),
                unrealizedPnl: parseFloat(rawPos.unrealizedPnl || rawPos.pnl || "0"),
                leverage: rawPos.leverage?.value || 10,
                marginUsed: parseFloat(rawPos.marginUsed || "0")
            };
        })
        .filter((p: any) => p !== null);
}

export async function getCandles(asset: string, interval: string, limit: number): Promise<Candle[]> {
    const { infoClient } = initHyperliquid();
    const intervalMs = interval === "1h" ? 3600000 : 
                       interval === "15m" ? 900000 : 
                       interval === "1m" ? 60000 : 86400000;
    const startTime = Date.now() - (limit * 2 * intervalMs); // Buffer for extra data
    
    const data = await safeRequest(() => infoClient!.candleSnapshot({ 
        coin: asset, 
        interval: interval as any, 
        startTime, 
        endTime: Date.now() 
    })) as any[];
    
    return data.slice(-limit).map((c: any) => ({
        t: c.t,
        o: parseFloat(c.o),
        h: parseFloat(c.h),
        l: parseFloat(c.l),
        c: parseFloat(c.c),
        v: parseFloat(c.v),
        n: parseFloat(c.n || "0")
    }));
}

function formatPrice(price: number): string {
    const str = price.toPrecision(5);
    if (str.includes('.')) return str.replace(/0+$/, '').replace(/\.$/, '');
    return str;
}

export async function checkPositionTPSL(pos: any, opts: { tpMulti: number, slMulti: number, trailRatio?: number, trailPeak?: number }) {
    const currentPrice = await getMidPrice(pos.asset);
    const pnlPct = pos.side === "LONG"
        ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100 * pos.leverage
        : ((pos.entryPrice - currentPrice) / pos.entryPrice) * 100 * pos.leverage;

    const tpPrice = pos.side === "LONG" ? pos.entryPrice * (1 + opts.tpMulti / 100) : pos.entryPrice * (1 - opts.tpMulti / 100);
    const slPrice = pos.side === "LONG" ? pos.entryPrice * (1 - opts.slMulti / 100) : pos.entryPrice * (1 + opts.slMulti / 100);

    if (pos.side === "LONG") {
        if (currentPrice >= tpPrice) return { shouldClose: true, reason: "tp", pnlPct, currentPrice, pnlUsdc: (pnlPct / 100) * pos.marginUsed };
        if (currentPrice <= slPrice) return { shouldClose: true, reason: "sl", pnlPct, currentPrice, pnlUsdc: (pnlPct / 100) * pos.marginUsed };
    } else {
        if (currentPrice <= tpPrice) return { shouldClose: true, reason: "tp", pnlPct, currentPrice, pnlUsdc: (pnlPct / 100) * pos.marginUsed };
        if (currentPrice >= slPrice) return { shouldClose: true, reason: "sl", pnlPct, currentPrice, pnlUsdc: (pnlPct / 100) * pos.marginUsed };
    }

    let newTrailPeak = opts.trailPeak;
    if (pos.side === "LONG") {
        if (currentPrice > (opts.trailPeak || pos.entryPrice)) newTrailPeak = currentPrice;
        
        // Check Trailing Stop
        if (opts.trailRatio && newTrailPeak) {
            const trailStopPrice = newTrailPeak * opts.trailRatio;
            if (currentPrice <= trailStopPrice) {
                return { shouldClose: true, reason: "trailing_stop", pnlPct, currentPrice, pnlUsdc: (pnlPct / 100) * pos.marginUsed };
            }
        }
    } else {
        if (currentPrice < (opts.trailPeak || pos.entryPrice)) newTrailPeak = currentPrice;

        // Check Trailing Stop (for SHORT, stop is ABOVE the peak/lowest)
        if (opts.trailRatio && newTrailPeak) {
            const trailStopPrice = newTrailPeak * (1 + (1 - opts.trailRatio));
            if (currentPrice >= trailStopPrice) {
                return { shouldClose: true, reason: "trailing_stop", pnlPct, currentPrice, pnlUsdc: (pnlPct / 100) * pos.marginUsed };
            }
        }
    }

    return { shouldClose: false, newTrailPeak };
}

export async function placeLimitOrder(asset: string, isBuy: boolean, size: number, price: number) {
    const { infoClient, exchangeClient } = initHyperliquid();
    const meta = await infoClient.meta() as any;
    const assetIndex = meta.universe.findIndex((a: any) => a.name === asset);
    const szDecimals = meta.universe[assetIndex].szDecimals;
    return await exchangeClient!.order({
        orders: [{
            a: assetIndex,
            b: isBuy,
            p: formatPrice(price),
            s: size.toFixed(szDecimals),
            r: false,
            t: { limit: { tif: "Gtc" } }
        }],
        grouping: "na"
    });
}

export async function closePosition(asset: string, size: number, isBuy: boolean) {
    try {
        const { infoClient, exchangeClient } = initHyperliquid();
        const meta = await infoClient.meta() as any;
        const assetIndex = meta.universe.findIndex((a: any) => a.name === asset);
        const szDecimals = meta.universe[assetIndex].szDecimals;
        const midPx = await getMidPrice(asset);
        const limitPrice = isBuy ? midPx * 1.02 : midPx * 0.98;
        return await exchangeClient!.order({
            orders: [{
                a: assetIndex,
                b: isBuy,
                p: formatPrice(limitPrice),
                s: size.toFixed(szDecimals),
                r: true,
                t: { limit: { tif: "Ioc" } }
            }]
        });
    } catch (err: any) {
        if (err.message?.includes("Reduce only order would increase position")) {
            console.log(`ℹ️ [Close] Position already closed or reducing: ${asset}`);
            return { status: "ok", response: { type: "error", data: { error: "Position already closed" } } };
        }
        throw err;
    }
}

export async function getMaxLeverage(assetName: string): Promise<number> {
    const { infoClient } = initHyperliquid();
    const meta = await infoClient.meta() as any;
    const asset = meta.universe.find((a: any) => a.name === assetName);
    return asset ? asset.maxLeverage : 10;
}

export async function setLeverage(assetName: string, leverage: number) {
    const { exchangeClient, infoClient } = initHyperliquid();
    const meta = await infoClient.meta() as any;
    const asset = meta.universe.find((a: any) => a.name === assetName);
    if (!asset) return;

    const finalLeverage = Math.min(leverage, asset.maxLeverage);
    if (finalLeverage < leverage) {
        console.log(`⚠️ Capping leverage for ${assetName} to ${finalLeverage}x (Max allowed: ${asset.maxLeverage}x)`);
    }
    return await exchangeClient!.updateLeverage({
        asset: meta.universe.indexOf(asset),
        isCross: true,
        leverage: finalLeverage
    });
}

export async function placeTPSLOrders(asset: string, size: number, isBuy: boolean, tpPrice: number, slPrice: number, useLimitTP: boolean = false) {
    try {
        const { infoClient, exchangeClient } = initHyperliquid();
        const meta = await infoClient.meta() as any;
        const assetIndex = meta.universe.findIndex((a: any) => a.name === asset);
        const szDecimals = meta.universe[assetIndex].szDecimals;

        const tpLog = tpPrice > 0 ? `${useLimitTP ? 'Limit' : 'Market'} TP ($${tpPrice.toFixed(4)})` : 'NO TP';
        const slLog = slPrice > 0 ? `Market SL ($${slPrice.toFixed(4)})` : 'NO SL';
        console.log(`📡 Placing ${tpLog} and ${slLog} for ${asset}...`);
        
        const orders: any[] = [];

        // 1. Take Profit (Only if price > 0)
        if (tpPrice > 0) {
            if (useLimitTP) {
                // MAKER TP: Standard Limit order (GTC)
                orders.push({
                    a: assetIndex,
                    b: !isBuy,
                    p: formatPrice(tpPrice),
                    s: size.toFixed(szDecimals),
                    r: true, // Reduce only
                    t: { limit: { tif: "Gtc" } }
                });
            } else {
                // TAKER TP: Trigger Market
                orders.push({
                    a: assetIndex,
                    b: !isBuy,
                    p: formatPrice(tpPrice),
                    s: size.toFixed(szDecimals),
                    r: true,
                    t: { trigger: { isMarket: true, triggerPx: formatPrice(tpPrice), tpsl: "tp" } }
                });
            }
        }

        // 2. Stop Loss (Always Trigger Market for safety, only if price > 0)
        if (slPrice > 0) {
            orders.push({
                a: assetIndex,
                b: !isBuy,
                p: formatPrice(slPrice),
                s: size.toFixed(szDecimals),
                r: true,
                t: { trigger: { isMarket: true, triggerPx: formatPrice(slPrice), tpsl: "sl" } }
            });
        }

        if (orders.length === 0) return { status: "ok" };

        const result = await exchangeClient!.order({ orders });
        if (result.status !== "ok") {
            console.error(`❌ [TPSL] Exchange Error: ${JSON.stringify(result)}`);
        }
        return result;
    } catch (err: any) {
        if (err.message?.includes("Reduce only order would increase position")) {
            console.log(`ℹ️ [TPSL] Position already closed, skipping protection for ${asset}`);
            return { status: "ok" };
        }
        console.error(`❌ [TPSL] Critical Error: ${err.message}`);
        throw err;
    }
}


export async function getAllTradableAssets() {
    const { infoClient } = initHyperliquid();
    const [meta, mids] = await Promise.all([infoClient.meta() as Promise<any>, infoClient.allMids() as Promise<any>]);
    return {
        assets: meta.universe.map((a: any, i: number) => ({
            name: a.name,
            index: i,
            szDecimals: a.szDecimals,
            price: parseFloat(mids[a.name] || "0")
        })),
        meta
    };
}

export async function checkAgentAuthorization() {
    const { infoClient } = initHyperliquid();
    const walletAddress = getMainWalletAddress();
    const signerAddress = getSigningAddress();
    const privateKey = getWalletPrivateKey();
    if (!walletAddress || !signerAddress || !privateKey) return { authorized: false, agentAddress: "", userAddress: walletAddress || "" };
    const signer = new PrivateKeySigner(privateKey as `0x${string}`);
    const agentAddress = signer.address;
    return { authorized: true, agentAddress, userAddress: walletAddress };
}

export async function getUserFills(userAddress: string) {
    const { infoClient } = initHyperliquid();
    return await safeRequest(() => infoClient!.userFills({ user: userAddress as `0x${string}` })) as any[];
}

export async function getOpenOrders() {
    const { infoClient } = initHyperliquid();
    const address = getMainWalletAddress();
    if (!address) return [];
    return await safeRequest(() => infoClient!.openOrders({ user: address as `0x${string}` })) as any[];
}

export async function cancelOrder(asset: string, oid: number) {
    const { infoClient, exchangeClient } = initHyperliquid();
    const meta = await infoClient.meta() as any;
    const assetIndex = meta.universe.findIndex((a: any) => a.name === asset);
    return await exchangeClient!.cancel({ cancels: [{ a: assetIndex, o: oid }] });
}
