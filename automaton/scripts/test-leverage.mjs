import { initHyperliquid } from './dist/survival/hyperliquid.js';

async function testLev() {
    const { exchangeClient } = initHyperliquid();
    try {
        console.log("Trying with { coin: 'DOGE' }");
        await exchangeClient.updateLeverage({ coin: "DOGE", isCross: true, leverage: 10 });
        console.log("Success with 'coin'");
    } catch (e) {
        console.log("Error with 'coin':", e.message);
    }
}

testLev();
