import { loadConfig } from "./src/config.js";
import { BinanceExchange } from "./src/survival/binance.js";
import { createDatabase } from "./src/state/database.js";
import { resolvePath } from "./src/config.js";

async function test() {
    console.log("Loading config...");
    const config = loadConfig();
    if (!config) throw new Error("No config");

    console.log("Initializing exchange...");
    const exchange = new BinanceExchange(config.binanceApiKey, config.binanceApiSecret);
    await exchange.init();
    
    console.log("Testing getOpenPositions...");
    try {
        const pos = await exchange.getOpenPositions();
        console.log("Positions:", pos.length);
    } catch(e:any) { console.error("getOpenPositions ERROR:", e.message); }

    console.log("Testing getOpenOrders...");
    try {
        const ord = await exchange.getOpenOrders();
        console.log("Orders:", ord.length);
    } catch(e:any) { console.error("getOpenOrders ERROR:", e.message); }

    console.log("Testing getBalance...");
    try {
        const bal = await exchange.getBalance();
        console.log("Balance:", bal.totalValue);
    } catch(e:any) { console.error("getBalance ERROR:", e.message); }

    console.log("Testing getUserFills...");
    try {
        const fills = await exchange.getUserFills();
        console.log("Fills:", fills.length);
    } catch(e:any) { console.error("getUserFills ERROR:", e.message); }

    console.log("Testing getMidPrice for DOGE...");
    try {
        const px = await exchange.getMidPrice("DOGE");
        console.log("DOGE Price:", px);
    } catch(e:any) { console.error("getMidPrice ERROR:", e.message); }

    console.log("Testing getCandles for DOGE...");
    try {
        const candles = await exchange.getCandles("DOGE", "15m", 150);
        console.log("Candles:", candles.length);
    } catch(e:any) { console.error("getCandles ERROR:", e.message); }

    console.log("Testing placeTPSLOrders for DOGE...");
    try {
        await exchange.placeTPSLOrders("DOGE", 10, true, 0, 0);
        console.log("placeTPSLOrders OK");
    } catch(e:any) { console.error("placeTPSLOrders ERROR:", e.message); }
}

test().catch(console.error);
