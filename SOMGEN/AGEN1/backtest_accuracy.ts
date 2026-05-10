/**
 * 🧪 AGEN1 BACKTEST ENGINE (ACCURACY EVALUATOR)
 * Mensimulasikan logika AGEN1 pada data historis untuk menguji Win Rate.
 */

interface Candle {
    time: string;
    close: number;
    rsi: number;
    ema20: number;
    ema50: number;
}

class Agen1Backtester {
    private candles: Candle[] = [];
    private trades: any[] = [];
    
    // Generasi Data Simulasi (Dalam realitas ini akan ditarik dari DB/API)
    generateMockData(count: number) {
        let price = 100;
        for (let i = 0; i < count; i++) {
            price += (Math.random() * 4) - 2;
            this.candles.push({
                time: `T-${count - i}`,
                close: price,
                rsi: 30 + Math.random() * 40, // Baseline neutral
                ema20: price * (1 + (Math.random() * 0.01)),
                ema50: price * (1 + (Math.random() * 0.02))
            });
        }
        // Menambahkan beberapa kondisi ekstrim untuk trigger signal
        this.candles[10].rsi = 25; // Oversold Trigger
        this.candles[25].rsi = 28; // Oversold Trigger
        this.candles[50].rsi = 75; // Overbought Trigger
        this.candles[75].rsi = 82; // Overbought Trigger
    }

    runBacktest() {
        console.log("--- MEMULAI BACKTEST AKURASI AGEN1 ---");
        let wins = 0;
        let losses = 0;

        for (let i = 1; i < this.candles.length - 5; i++) {
            const candle = this.candles[i];
            let signal = "NONE";

            // SKILL 2 & 9: Technical Signals (Strict Logic)
            if (candle.rsi < 30) signal = "LONG";
            else if (candle.rsi > 70) signal = "SHORT";

            if (signal !== "NONE") {
                // Evaluasi kebenaran sinyal dalam 5 candle ke depan
                const entryPrice = candle.close;
                const exitPrice = this.candles[i + 5].close;
                
                let isWin = false;
                if (signal === "LONG" && exitPrice > entryPrice) isWin = true;
                if (signal === "SHORT" && exitPrice < entryPrice) isWin = true;

                if (isWin) wins++; else losses++;

                this.trades.push({
                    time: candle.time,
                    type: signal,
                    entry: entryPrice.toFixed(2),
                    exit: exitPrice.toFixed(2),
                    result: isWin ? "✅ WIN" : "❌ LOSS"
                });
            }
        }

        const totalTrades = wins + losses;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        
        console.table(this.trades);
        console.log("\n--- HASIL AKURASI ---");
        console.log(`Total Trades: ${totalTrades}`);
        console.log(`Win Rate: ${winRate.toFixed(2)}%`);
        console.log(`Kesimpulan: ${winRate > 55 ? "AGEN1 SIAP DEPLOY (AKURAT)" : "AGEN1 PERLU OPTIMASI"}`);
    }
}

const tester = new Agen1Backtester();
tester.generateMockData(100);
tester.runBacktest();
