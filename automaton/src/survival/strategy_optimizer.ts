import { runBacktest } from "./backtest_simulator.js";
import { setStrategyConfig } from "./technicals.js";

async function optimize() {
    const coins = ['BTC', 'ETH', 'SOL', 'PEPE', 'DOGE'];
    const zScores = [1.8, 2.0, 2.2, 2.5, 2.8];
    const tps = [1.0, 1.5, 2.0];
    const sls = [0.5, 0.8, 1.0];

    console.log("🚀 STARTING AGGRESSIVE HIGH-FREQUENCY OPTIMIZER...");

    let bestResult: { totalProfit: number, params: any } = { totalProfit: -Infinity, params: {} };

    for (const z of zScores) {
        for (const tp of tps) {
            for (const sl of sls) {
                console.log(`\n🧪 Testing: Z=${z}, TP=${tp}%, SL=${sl}%`);
                setStrategyConfig({ zThreshold: z, tp: tp, sl: sl });
                
                let currentTotalProfit = 0;
                for (const coin of coins) {
                    try {
                        const result = await runBacktest(coin, 7); // 7 days for fast brute-force
                        currentTotalProfit += result.profit;
                    } catch (e: any) {}
                }

                console.log(`📊 Total for this set: ${currentTotalProfit.toFixed(2)}%`);
                if (currentTotalProfit > bestResult.totalProfit) {
                    bestResult = { totalProfit: currentTotalProfit, params: { z, tp, sl } };
                }
            }
        }
    }


    console.log("\n✨ OPTIMIZATION COMPLETE!");
    console.log("🏆 BEST STRATEGY FOUND:");
    console.log(`   Z-Score Threshold: ${bestResult.params.z}`);
    console.log(`   Take Profit      : ${bestResult.params.tp}%`);
    console.log(`   Expected Profit  : ${bestResult.totalProfit.toFixed(2)}%`);
}

optimize();
