import { CollaborativeForum } from './collaborative_reasoning';

/**
 * 🚀 SOMGEN REAL-LOGIC BACKTESTER
 * Menguji class CollaborativeForum asli dengan data simulasi intensif.
 */

class RealBacktest {
    private forum = new CollaborativeForum();
    private results: any[] = [];

    async run(iterations: number) {
        console.log("==================================================");
        console.log("🔥 TESTING REAL LOGIC: COLLABORATIVE REASONING 🔥");
        console.log("==================================================\n");

        for (let i = 0; i < iterations; i++) {
            const price = 100 + (Math.random() * 20);
            const rsi = Math.floor(Math.random() * 100);
            const adx = Math.floor(Math.random() * 50);
            const whaleFlow = (Math.random() * 4000000) - 2000000;
            const sentiment = Math.floor(Math.random() * 100);
            const panicAlert = Math.random() < 0.05; 

            // Data for agents
            const rawTech = { close: price, rsi, adx, ema20: 110 };
            const rawOnChain = { whaleFlow, liquidationTarget: (price * 1.02).toFixed(2) };
            const rawSocial = { sentiment, panicAlert };

            // 1. Run Forum (All 4 Agents)
            this.forum.clear();
            await this.forum.participate("AGEN0", {}, "AGGRESSIVE");
            await this.forum.participate("AGEN1", rawTech, "AGGRESSIVE");
            await this.forum.participate("AGEN2", rawOnChain, "AGGRESSIVE");
            await this.forum.participate("AGEN3", rawSocial, "AGGRESSIVE");

            // 2. Get Resolution
            const consensus = this.forum.resolveConsensus("AGGRESSIVE");

            // 3. Log Results
            if (consensus.decision !== "REJECT") {
                this.results.push({
                    iteration: i,
                    type: consensus.type,
                    decision: consensus.decision,
                    score: consensus.score,
                    reason: consensus.reasoning.substring(0, 60) + "..."
                });
            }
        }

        console.table(this.results);
        console.log("\n--- RINGKASAN BACKTEST REAL-LOGIC ---");
        console.log(`Total Siklus: ${iterations}`);
        console.log(`Peluang Lolos: ${this.results.length}`);
        console.log(`Reject Rate: ${((iterations - this.results.length) / iterations * 100).toFixed(2)}%`);
        console.log("\nKESIMPULAN: Agen sangat selektif. Mereka hanya setuju pada " + (this.results.length / iterations * 100).toFixed(1) + "% kondisi pasar.");
    }
}

const test = new RealBacktest();
test.run(50);
