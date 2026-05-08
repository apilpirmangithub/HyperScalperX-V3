/**
 * Binance Futures Implementation using CCXT
 */
import ccxt from "ccxt";
import { Exchange, ExchangeBalance, ExchangePosition, ExchangeOrder } from "./exchange.js";
import { type Candle } from "./technicals.js";

export class BinanceExchange implements Exchange {
    name = "Binance";
    private client: ccxt.binance;
    private subscribedAssets = new Set<string>();

    constructor(apiKey: string, secret: string) {
        this.client = new ccxt.binance({
            apiKey: apiKey,
            secret: secret,
            options: {
                defaultType: 'future',
                warnOnFetchOpenOrdersWithoutSymbol: false,
                adjustForMinPrecision: true
            },
        });
    }

    async init(): Promise<void> {
        // Load markets to get decimals and other info
        await this.client.loadMarkets();
        console.log(`[Binance] 🟢 Connected and markets loaded.`);
    }

    async getBalance(): Promise<ExchangeBalance> {
        const balance = await this.client.fetchBalance();
        const info = balance.info as any;
        
        // USDT-M Futures specific parsing
        const totalValue = parseFloat(balance.total['USDT'] || "0");
        const unrealizedPnl = parseFloat(info.totalUnrealizedProfit || "0");
        const marginUsed = parseFloat(info.totalMarginBalance || "0") - parseFloat(info.availableBalance || "0");

        return {
            totalValue: totalValue,
            accountValue: totalValue,
            spotValue: 0, // Spot not tracked in futures mode here
            withdrawable: parseFloat(info.availableBalance || "0"),
            marginUsed: marginUsed,
            unrealizedPnl: unrealizedPnl
        };
    }

    async getOpenPositions(): Promise<ExchangePosition[]> {
        const positions = await this.client.fetchPositions();
        return positions
            .filter(p => parseFloat(p.contracts || "0") !== 0)
            .map(p => ({
                asset: p.symbol.split('/')[0], // Convert BTC/USDT:USDT to BTC
                side: p.side === 'long' ? 'LONG' : 'SHORT',
                size: Math.abs(parseFloat(p.contracts as any)),
                entryPrice: parseFloat(p.entryPrice as any),
                unrealizedPnl: parseFloat(p.unrealizedPnl as any),
                leverage: parseFloat(p.leverage as any),
                marginUsed: parseFloat(p.initialMargin as any)
            }));
    }

    async getCandles(asset: string, interval: string, limit: number): Promise<Candle[]> {
        const symbol = `${asset}/USDT:USDT`;
        const ohlcv = await this.client.fetchOHLCV(symbol, interval, undefined, limit);
        return ohlcv.map((c: any) => ({
            t: c[0] as number,
            o: c[1] as number,
            h: c[2] as number,
            l: c[3] as number,
            c: c[4] as number,
            v: c[5] as number,
            n: 0 
        }));
    }

    async getMidPrice(asset: string): Promise<number> {
        const ticker = await this.client.fetchTicker(`${asset}/USDT:USDT`);
        return ((ticker.bid as number) + (ticker.ask as number)) / 2;
    }

    async placeLimitOrder(asset: string, isBuy: boolean, size: number, price: number): Promise<any> {
        const symbol = `${asset}/USDT:USDT`;
        const precisionPrice = this.client.priceToPrecision(symbol, price);
        const precisionSize = this.client.amountToPrecision(symbol, size);
        
        return await this.client.createLimitOrder(
            symbol,
            isBuy ? 'buy' : 'sell',
            precisionSize,
            precisionPrice
        );
    }

    async closePosition(asset: string, size: number, isBuy: boolean): Promise<any> {
        const symbol = `${asset}/USDT:USDT`;
        const precisionSize = this.client.amountToPrecision(symbol, size);
        
        return await this.client.createMarketOrder(
            symbol,
            isBuy ? 'buy' : 'sell',
            precisionSize,
            { 'reduceOnly': true }
        );
    }


    async placeTPSLOrders(asset: string, size: number, isBuy: boolean, tpPrice: number, slPrice: number): Promise<any> {
        const symbol = `${asset}/USDT:USDT`;
        const results = [];

        if (slPrice > 0) {
            results.push(await this.client.createOrder(
                symbol,
                'STOP_MARKET',
                isBuy ? 'sell' : 'buy',
                this.client.amountToPrecision(symbol, size),
                undefined,
                {
                    'stopPrice': this.client.priceToPrecision(symbol, slPrice),
                    'reduceOnly': true
                }
            ));
        }

        if (tpPrice > 0) {
            results.push(await this.client.createOrder(
                symbol,
                'TAKE_PROFIT_MARKET',
                isBuy ? 'sell' : 'buy',
                this.client.amountToPrecision(symbol, size),
                undefined,
                {
                    'stopPrice': this.client.priceToPrecision(symbol, tpPrice),
                    'reduceOnly': true
                }
            ));
        }


        return { status: 'ok', results };
    }

    async getOpenOrders(): Promise<ExchangeOrder[]> {
        const orders = await this.client.fetchOpenOrders();
        return orders.map((o: any) => ({
            coin: o.symbol.split('/')[0],
            oid: o.id,
            side: o.side as "buy" | "sell",
            sz: o.amount as number,
            px: o.price as number,
            timestamp: o.timestamp,
            reduceOnly: (o.info as any).reduceOnly === 'true' || (o.info as any).reduceOnly === true
        }));
    }

    async cancelOrder(asset: string, oid: any): Promise<any> {
        return await this.client.cancelOrder(oid, `${asset}/USDT:USDT`);
    }

    subscribeToPrices(assets: string[]): void {
        assets.forEach(a => this.subscribedAssets.add(a));
    }

    async getVolumeTop(limit: number): Promise<string[]> {
        const tickers = await this.client.fetchTickers();
        return Object.values(tickers)
            .filter((t: any) => t.symbol.endsWith('/USDT:USDT'))
            .sort((a: any, b: any) => (b.quoteVolume || 0) - (a.quoteVolume || 0))
            .slice(0, limit)
            .map((t: any) => t.symbol.split('/')[0]);
    }

    async getUserFills(address?: string): Promise<any[]> {
        // Binance specific: fetchMyTrades
        const trades = await this.client.fetchMyTrades(undefined, undefined, 50);
        return trades.map((t: any) => ({
            coin: t.symbol.split('/')[0],
            time: t.timestamp,
            px: t.price,
            sz: t.amount,
            side: t.side,
            closedPnl: (t.info as any).realizedPnl || "0"
        }));
    }
}
