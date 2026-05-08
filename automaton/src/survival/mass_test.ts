import { runBacktest } from "./backtest_simulator.js";

async function massTest() {
    const coins = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'NEAR', 'ATOM', 'DOGE', 'SHIB', 'LTC', 'BCH', 'FIL', 'APT', 'OP', 'ARB', 'TIA', 'SUI'];
    console.log("--- STARTING MASSIVE REPORT ---");
    for (const coin of coins) {
        try {
            await runBacktest(coin, 30);
        } catch (e) {
            console.log(`Failed for ${coin}`);
        }
    }
}

massTest();
