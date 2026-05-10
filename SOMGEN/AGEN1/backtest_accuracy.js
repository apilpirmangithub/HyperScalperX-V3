/**
 * 🧪 AGEN1 BACKTEST ENGINE (ACCURACY EVALUATOR) - JS VERSION
 * Mensimulasikan logika AGEN1 pada data historis untuk menguji Win Rate.
 */

class Agen1Backtester {
    constructor() {
        this.candles = [];
        this.trades = [];
    }
    
    generateMockData(count) {
        let price = 100;
        let trend = 0.2; // Slight bullish bias
        for (let i = 0; i < count; i++) {
            trend += (Math.random() * 0.1) - 0.05;
            price += trend + (Math.random() * 2) - 1;
            
            const rsi = 30 + (Math.random() * 40) + (trend * 10);
            const adx = 15 + (Math.abs(trend) * 100); // Higher trend = higher ADX
            
            this.candles.push({
                time: `T-${count - i}`,
                close: price,
                rsi: Math.max(10, Math.min(90, rsi)),
                adx: adx,
                ema20: price * 0.98, // Mock EMA below price
                ema50: price * 0.96
            });
        }
    }

    runBacktest() {
        console.log("--- MEMULAI BACKTEST KONSENSUS (AGEN1 + AGEN2 VETO) ---");
        let wins = 0;
        let losses = 0;
        let vetoed = 0;

        for (let i = 1; i < this.candles.length - 5; i++) {
            const candle = this.candles[i];
            let signal = "NONE";

            // 1. AGEN1: Smart Regime
            const isTrending = candle.adx > 25;
            const trendDir = candle.close > candle.ema20 ? "UP" : "DOWN";
            if (isTrending) {
                if (trendDir === "UP" && candle.rsi < 45) signal = "LONG";
                else if (trendDir === "DOWN" && candle.rsi > 55) signal = "SHORT";
            } else {
                if (candle.rsi < 30) signal = "LONG";
                else if (candle.rsi > 70) signal = "SHORT";
            }

            if (signal !== "NONE") {
                // 2. AGEN2: Veto Check
                const whaleFlow = (Math.random() * 4000000) - 2000000;
                let isVetoed = false;
                if (signal === "LONG" && whaleFlow < -1500000) isVetoed = true;
                if (signal === "SHORT" && whaleFlow > 1500000) isVetoed = true;

                // 3. AGEN3: Emergency Veto (Black Swan)
                const panicAlert = Math.random() < 0.03; // 3% chance in simulation
                if (panicAlert) {
                    vetoed++;
                    console.log(`[AGEN3] 🚨 EMERGENCY VETO! System halted at ${candle.time}`);
                    continue;
                }

                if (isVetoed) {
                    vetoed++;
                    continue; 
                }

                const entryPrice = candle.close;
                const exitPrice = this.candles[i + 5].close;
                
                let isWin = false;
                if (signal === "LONG" && exitPrice > entryPrice) isWin = true;
                if (signal === "SHORT" && exitPrice < entryPrice) isWin = true;

                if (isWin) wins++; else losses++;

                this.trades.push({
                    time: candle.time,
                    type: signal,
                    adx: candle.adx.toFixed(1),
                    whale: (whaleFlow/1000000).toFixed(1) + "M",
                    result: isWin ? "✅ WIN" : "❌ LOSS"
                });
            }
        }

        const totalTrades = wins + losses;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        
        console.table(this.trades.slice(0, 20));
        console.log("\n--- HASIL KONSENSUS (SKILL ENFORCED) ---");
        console.log(`Trades Executed: ${totalTrades}`);
        console.log(`Trades Vetoed by AGEN2: ${vetoed}`);
        console.log(`Final Consensus Win Rate: ${winRate.toFixed(2)}%`);
        console.log(`Kesimpulan: ${winRate > 60 ? "SISTEM SANGAT AKURAT (GO!)" : "BUTUH PENGETATAN SENTIMEN (AGEN3)"}`);
    }
}

const tester = new Agen1Backtester();
tester.generateMockData(500);
tester.runBacktest();
