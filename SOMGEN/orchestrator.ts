import { CollaborativeForum } from './collaborative_reasoning';
import { fetchLiveSomniaData } from './somnia_provider';

// Simulated state management
let activeActions = {
    TRADING_POSITIONS: 0,
    DEFI_POSITIONS: 0
};
const MAX_CONCURRENT_ACTIONS = 2;
let userProfile = "AGGRESSIVE"; // User default
let customAgentActive = true;  // Simulated: User forged an agent
let customAgentPrompt = "Jadilah analis agresif yang mengejar yield tinggi"; 

const forum = new CollaborativeForum();

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 👑 SOMGEN MASTER ORCHESTRATOR (SOMNIA NATIVE) 👑
 */
async function startOrchestratorLoop() {
    console.log("==================================================");
    console.log("🌌 INITIATING SOMGEN MASTER ORCHESTRATOR 🌌");
    console.log("      (100% SOMNIA NATIVE DATA FEED)");
    console.log("==================================================\n");

    const targetCoins = ["SOMI", "WETH", "WBTC"];

    while (true) {
        try {
            const totalActive = activeActions.TRADING_POSITIONS + activeActions.DEFI_POSITIONS;

            if (totalActive >= MAX_CONCURRENT_ACTIONS) {
                console.log(`\n[ORCHESTRATOR] 🛑 Max capacity reached. Monitoring active positions...`);
                await sleep(10000);
                // Simple exit simulation
                if (Math.random() > 0.8) {
                    if (activeActions.TRADING_POSITIONS > 0) activeActions.TRADING_POSITIONS--;
                    else if (activeActions.DEFI_POSITIONS > 0) activeActions.DEFI_POSITIONS--;
                }
                continue;
            }

            const currentCoin = targetCoins[Math.floor(Math.random() * targetCoins.length)];
            
            // 1. DATA INGESTION (REAL SOMNIA RPC MOCK)
            console.log(`\n[SCANNER] 🟢 Hunting on Somnia Network for ${currentCoin}...`);
            const marketData = await fetchLiveSomniaData(currentCoin);
            
            console.log(`[ORACLE] Price: $${marketData.price.toFixed(4)} | RSI: ${marketData.rsi} | Flow: $${marketData.whaleFlow.toLocaleString()}`);

            // 2. COLLABORATIVE REASONING
            forum.clear();
            await forum.participate("AGEN0", marketData, currentCoin);
            await forum.participate("AGEN1", marketData, currentCoin);
            await forum.participate("AGEN2", marketData, currentCoin);
            await forum.participate("AGEN3", marketData, currentCoin);

            if (customAgentActive) {
                await forum.participate("CUSTOM", { ...marketData, customPrompt: customAgentPrompt } as any, currentCoin);
            }

            // 3. CONSENSUS RESOLUTION
            const consensus = forum.resolveConsensus(userProfile);
            console.log(`\n[JUDGE] Final Decision: ${consensus.decision} (Confidence: ${consensus.score.toFixed(2)})`);
            console.log(`[REASON] ${consensus.reasoning}`);

            // 4. EXECUTION
            if (consensus.decision !== "REJECT") {
                if (consensus.type === "DEFI") {
                    activeActions.DEFI_POSITIONS++;
                    console.log(`[EXECUTOR] 💰 DEFI YIELD DEPLOYED TO SOMNIA PROTOCOL.`);
                } else {
                    activeActions.TRADING_POSITIONS++;
                    console.log(`[EXECUTOR] ⚡ TRADING POSITION OPENED ON SOMNEX PERPS.`);
                }
            } else {
                console.log(`[EXECUTOR] 🛡️ MISSION ABORTED FOR SAFETY.`);
            }

            console.log("\n[ORCHESTRATOR] ⏱️ Cycle complete. Resting 10s...");
            await sleep(10000);

        } catch (error: any) {
            console.error("\n[🚨 CRITICAL] Orchestrator error:", error.message);
            await sleep(10000);
        }
    }
}

startOrchestratorLoop();
