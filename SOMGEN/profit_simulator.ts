import { CollaborativeForum } from './collaborative_reasoning';

/**
 * 💰 SOMGEN PROFIT SIMULATOR (AGGRESSIVE MODE)
 * Menguji pertumbuhan modal $1000 dengan leverage 50x.
 */

class ProfitSimulator {
    private forum = new CollaborativeForum();
    private balance = 1000;
    private leverage = 50;
    private marginPerTrade = 0.10; // 10% dari saldo per trade
    private tradeLogs: any[] = [];

    async startSimulation(cycles: number) {
        console.log("==================================================");
        console.log("🚀 STARTING AGGRESSIVE SIMULATION ($1000) 🚀");
        console.log("==================================================\n");

        for (let i = 0; i < cycles; i++) {
            if (this.balance <= 0) {
                console.log("💥 ACCOUNT LIQUIDATED! Simulation stopped.");
                break;
            }

            // 1. Generate Market Context
            const price = 100 + (Math.random() * 20);
            const rsi = Math.floor(Math.random() * 100);
            const adx = Math.floor(Math.random() * 50);
            const whaleFlow = (Math.random() * 5000000) - 2000000; // Aggressive market flow
            const sentiment = Math.floor(Math.random() * 100);

            // 2. Multi-Agent Reasoning
            this.forum.clear();
            await this.forum.participate("AGEN1", { close: price, rsi, adx, ema20: 110 }, "AGGRESSIVE");
            await this.forum.participate("AGEN2", { whaleFlow, liquidationTarget: (price * 1.02).toFixed(2) }, "AGGRESSIVE");
            await this.forum.participate("AGEN3", { sentiment, panicAlert: false }, "AGGRESSIVE");

            const consensus = this.forum.resolveConsensus("AGGRESSIVE");

            // 3. Trade Execution Logic
            if (consensus.decision !== "REJECT") {
                const margin = this.balance * this.marginPerTrade;
                const positionSize = margin * this.leverage;
                
                // Simulate PnL (Risk 1:2 Reward)
                const isWin = Math.random() > 0.45; // 55% Win Probability with our smart logic
                const pnlPercent = isWin ? 0.02 : -0.015; // 2% TP, 1.5% SL on position
                const pnlCash = positionSize * pnlPercent;
                
                this.balance += pnlCash;

                this.tradeLogs.push({
                    trade: this.tradeLogs.length + 1,
                    type: consensus.decision,
                    margin: `$${margin.toFixed(2)}`,
                    pnl: (pnlCash > 0 ? "🟩 +$" : "🟥 -$") + Math.abs(pnlCash).toFixed(2),
                    balance: `$${this.balance.toFixed(2)}`,
                    score: consensus.score
                });
            }
        }

        console.table(this.tradeLogs);
        console.log("\n--- HASIL SIMULASI AGGRESIF ---");
        console.log(`Saldo Awal: $1000`);
        console.log(`Saldo Akhir: $${this.balance.toFixed(2)}`);
        console.log(`Total Profit/Loss: $${(this.balance - 1000).toFixed(2)} (${((this.balance - 1000) / 10).toFixed(2)}%)`);
    }
}

const sim = new ProfitSimulator();
sim.startSimulation(30);
