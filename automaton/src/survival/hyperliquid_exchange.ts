/**
 * Hyperliquid Implementation of the Exchange Interface
 */
import * as hl from "./hyperliquid.js";
import { Exchange, ExchangeBalance, ExchangePosition, ExchangeOrder } from "./exchange.js";
import { type Candle } from "./technicals.js";

export class HyperliquidExchange implements Exchange {
    name = "Hyperliquid";

    async init(): Promise<void> {
        hl.initHyperliquid();
    }

    async getBalance(): Promise<ExchangeBalance> {
        return await hl.getBalance();
    }

    async getOpenPositions(): Promise<ExchangePosition[]> {
        const positions = await hl.getOpenPositions();
        return positions.map((p: any) => ({
            asset: p.asset,
            side: p.side,
            size: p.size,
            entryPrice: p.entryPrice,
            unrealizedPnl: p.unrealizedPnl,
            leverage: p.leverage,
            marginUsed: p.marginUsed
        }));
    }

    async getCandles(asset: string, interval: string, limit: number): Promise<Candle[]> {
        return await hl.getCandles(asset, interval, limit);
    }

    async getMidPrice(asset: string): Promise<number> {
        return await hl.getMidPrice(asset);
    }

    async placeLimitOrder(asset: string, isBuy: boolean, size: number, price: number): Promise<any> {
        return await hl.placeLimitOrder(asset, isBuy, size, price);
    }

    async closePosition(asset: string, size: number, isBuy: boolean): Promise<any> {
        return await hl.closePosition(asset, size, isBuy);
    }

    async placeTPSLOrders(asset: string, size: number, isBuy: boolean, tpPrice: number, slPrice: number): Promise<any> {
        return await hl.placeTPSLOrders(asset, size, isBuy, tpPrice, slPrice);
    }

    async getOpenOrders(): Promise<ExchangeOrder[]> {
        const orders = await hl.getOpenOrders();
        return orders.map(o => ({
            coin: o.coin,
            oid: o.oid,
            side: o.side as "buy" | "sell",
            sz: o.sz,
            px: o.px,
            timestamp: o.timestamp,
            reduceOnly: o.reduceOnly
        }));
    }

    async cancelOrder(asset: string, oid: any): Promise<any> {
        return await hl.cancelOrder(asset, oid);
    }

    subscribeToPrices(assets: string[]): void {
        hl.subscribeToPrices(assets);
    }

    async getVolumeTop(limit: number): Promise<string[]> {
        const { infoClient } = hl.initHyperliquid();
        const data = await infoClient.metaAndAssetCtxs();
        const universe = data[0].universe;
        const ctxs = data[1];

        return universe.map((u, i) => ({
            name: u.name,
            volume: parseFloat(ctxs[i].dayNtlVlm || "0")
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, limit)
        .map(a => a.name);
    }

    async getUserFills(address?: string): Promise<any[]> {
        return await hl.getUserFills(address || "");
    }
}
