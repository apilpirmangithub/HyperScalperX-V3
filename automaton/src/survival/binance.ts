/**
 * Binance Futures Implementation using CCXT
 */
import ccxt from "ccxt";
import { Exchange, ExchangeBalance, ExchangePosition, ExchangeOrder } from "./exchange.js";
import { type Candle } from "./technicals.js";

export class BinanceExchange implements Exchange {
    name = "Binance";
    private client: any;
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
        
        // BUG FIX: Ensure One-Way Mode (required for our reduceOnly logic)
        try {
            await this.client.setPositionsMode(false); // false = One-Way Mode
            console.log(`[Binance] 🔄 Position Mode set to One-Way.`);
        } catch (e) {
            // Ignore if already set
        }

        console.log(`[Binance] 🟢 Connected and markets loaded.`);
    }

    async getBalance(): Promise<ExchangeBalance> {
        const balance = await this.client.fetchBalance();
        const info = balance.info as any;
        
        // Binance Futures Specific: info contains totalWalletBalance and totalMarginBalance
        // totalMarginBalance is the real "Equity" (Wallet + Unrealized PnL)
        const equity = parseFloat(info.totalMarginBalance || "0");
        const walletBalance = parseFloat(info.totalWalletBalance || "0");
        const unrealizedPnl = parseFloat(info.totalUnrealizedProfit || "0");
        const available = parseFloat(info.availableBalance || "0");

        return {
            totalValue: equity,
            accountValue: walletBalance,
            spotValue: 0,
            withdrawable: available,
            marginUsed: equity - available,
            unrealizedPnl: unrealizedPnl
        };
    }

    async getOpenPositions(): Promise<ExchangePosition[]> {
        const positions = await this.client.fetchPositions();
        return positions
            .filter((p: any) => parseFloat(p.contracts || "0") !== 0)
            .map((p: any) => ({
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
        return ((ticker.bid as number) + (ticker.ask as number)) / 2 || (ticker.last as number);
    }

    async placeLimitOrder(asset: string, isBuy: boolean, size: number, price: number): Promise<any> {
        const symbol = `${asset}/USDT:USDT`;
        
        // BUG FIX: Ensure leverage is set to 20x
        try { await this.client.setLeverage(20, symbol); } catch (e) {}
        
        // BUG FIX: Ensure Margin Mode is CROSS (not Isolated)
        try { await this.client.setMarginMode('CROSSED', symbol); } catch (e) {}

        const precisionPrice = this.client.priceToPrecision(symbol, price);
        const precisionSize = this.client.amountToPrecision(symbol, size);
        
        return await this.client.createLimitOrder(
            symbol,
            isBuy ? 'buy' : 'sell',
            parseFloat(precisionSize),
            parseFloat(precisionPrice)
        );
    }

    async placeMarketOrder(asset: string, isBuy: boolean, size: number): Promise<any> {
        const symbol = `${asset}/USDT:USDT`;
        
        // Ensure leverage is set
        try { await this.client.setLeverage(20, symbol); } catch (e) {}
        
        // Ensure Margin Mode is CROSS
        try { await this.client.setMarginMode('CROSSED', symbol); } catch (e) {}

        // Calculate precision size with safety checks
        const rawPrecision = this.client.amountToPrecision(symbol, size);
        const precisionSize = parseFloat(rawPrecision);

        console.log(`[Binance] 📐 Market Order: ${asset} | Raw Size: ${size} | Precision: ${rawPrecision} | Parsed: ${precisionSize} | Side: ${isBuy ? 'BUY' : 'SELL'}`);

        if (!precisionSize || precisionSize <= 0 || isNaN(precisionSize)) {
            throw new Error(`Invalid quantity after precision: raw=${size}, precision=${rawPrecision}, parsed=${precisionSize}. Market ${symbol} may have high minAmount.`);
        }

        return await this.client.createMarketOrder(
            symbol,
            isBuy ? 'buy' : 'sell',
            precisionSize
        );
    }

    async closePosition(asset: string, size: number, isBuy: boolean): Promise<any> {
        const symbol = `${asset}/USDT:USDT`;
        
        // BUG FIX: Clean up ALL open orders for this asset when closing
        try {
            await this.client.cancelAllOrders(symbol);
            console.log(`[Binance] 🧹 Cleaned up all orders for ${asset}`);
        } catch (e) {}

        const precisionSize = this.client.amountToPrecision(symbol, size);
        
        return await this.client.createMarketOrder(
            symbol,
            isBuy ? 'buy' : 'sell',
            parseFloat(precisionSize),
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
                undefined,
                undefined,
                {
                    'stopPrice': this.client.priceToPrecision(symbol, slPrice),
                    'closePosition': true
                }
            ));
        }

        if (tpPrice > 0) {
            results.push(await this.client.createOrder(
                symbol,
                'TAKE_PROFIT_MARKET',
                isBuy ? 'sell' : 'buy',
                undefined,
                undefined,
                {
                    'stopPrice': this.client.priceToPrecision(symbol, tpPrice),
                    'closePosition': true
                }
            ));
        }

        return { status: 'ok', results };
    }

    async getOpenOrders(): Promise<ExchangeOrder[]> {
        try {
            // Fetch both regular and algo (conditional) orders
            const [regularOrders, algoOrders] = await Promise.all([
                this.client.fetchOpenOrders(),
                this.client.fapiPrivateGetOpenAlgoOrders()
            ]);

            const mappedRegular = regularOrders.map((o: any) => ({
                coin: o.symbol.split('/')[0],
                oid: o.id,
                side: o.side as "buy" | "sell",
                sz: o.amount as number,
                px: o.price as number,
                timestamp: o.timestamp,
                type: o.type,
                reduceOnly: o.reduceOnly === true || 
                           (o.info && (o.info.reduceOnly === 'true' || o.info.reduceOnly === true)) || 
                           (o.info && (o.info.closePosition === 'true' || o.info.closePosition === true))
            }));

            const mappedAlgo = (algoOrders || []).map((o: any) => ({
                coin: o.symbol.replace('USDT', ''),
                oid: o.algoId,
                side: o.side.toLowerCase() as "buy" | "sell",
                sz: parseFloat(o.quantity || "0"),
                px: parseFloat(o.price || "0"),
                timestamp: parseInt(o.createTime),
                type: o.orderType.toLowerCase(),
                reduceOnly: o.reduceOnly === true || o.reduceOnly === 'true' || o.closePosition === true || o.closePosition === 'true'
            }));

            return [...mappedRegular, ...mappedAlgo];
        } catch (e) {
            console.error(`[Binance] ❌ Error fetching open orders:`, e);
            return [];
        }
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

    async getUserFills(address?: string, symbol?: string): Promise<any[]> {
        // Binance specific: fetchMyTrades requires symbol for futures
        if (!symbol) return [];
        try {
            const trades = await this.client.fetchMyTrades(`${symbol}/USDT:USDT`, undefined, 50);
            return trades.map((t: any) => ({
                coin: t.symbol.split('/')[0],
                time: t.timestamp,
                px: t.price,
                sz: t.amount,
                side: t.side,
                closedPnl: (t.info as any).realizedPnl || "0"
            }));
        } catch (e) {
            return [];
        }
    }
}
