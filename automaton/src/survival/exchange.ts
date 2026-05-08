/**
 * Exchange Interface for HyperScalperX
 * Allows seamless switching between Hyperliquid and Binance.
 */

import { type Candle } from "./technicals.js";

export interface ExchangePosition {
    asset: string;
    side: "LONG" | "SHORT";
    size: number;
    entryPrice: number;
    unrealizedPnl: number;
    leverage: number;
    marginUsed: number;
}

export interface ExchangeBalance {
    totalValue: number;
    accountValue: number;
    spotValue: number;
    withdrawable: number;
    marginUsed: number;
    unrealizedPnl: number;
}

export interface ExchangeOrder {
    coin: string;
    oid: any;
    side: "buy" | "sell";
    sz: number;
    px: number;
    timestamp: number;
    reduceOnly: boolean;
}

export interface Exchange {
    name: string;
    init(): Promise<void>;
    getBalance(): Promise<ExchangeBalance>;
    getOpenPositions(): Promise<ExchangePosition[]>;
    getCandles(asset: string, interval: string, limit: number): Promise<Candle[]>;
    getMidPrice(asset: string): Promise<number>;
    placeLimitOrder(asset: string, isBuy: boolean, size: number, price: number): Promise<any>;
    closePosition(asset: string, size: number, isBuy: boolean): Promise<any>;
    placeTPSLOrders(asset: string, size: number, isBuy: boolean, tpPrice: number, slPrice: number): Promise<any>;
    getOpenOrders(): Promise<ExchangeOrder[]>;
    cancelOrder(asset: string, oid: any): Promise<any>;
    subscribeToPrices(assets: string[]): void;
    getVolumeTop(limit: number): Promise<string[]>;
    getUserFills(address?: string): Promise<any[]>;
}
