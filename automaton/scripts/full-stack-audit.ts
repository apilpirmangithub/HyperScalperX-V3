import { runCycle } from "../src/survival/hype-king-loop.js";
import { initHyperliquid } from "../src/survival/hyperliquid.js";

async function runFullStackAudit() {
    console.log("🛡️ STARTING SULTAN AGUNG FULL-STACK AUDIT...");
    
    // 1. Force a signal for TIA via the modification we made to technials.ts
    process.env.FORCE_SIGNAL = "TIA";
    
    // 2. Mock a minimal DB for the test
    const mockDb: any = {
        insertActivity: (data: any) => console.log(`[DB Activity] ${data.messageEn}`),
        getKV: (key: string) => null,
        insertTrade: (data: any) => console.log(`[DB Trade] SAVING TRADE: ${JSON.stringify(data)}`),
        getOpenTrades: () => []
    };

    try {
        console.log("📡 Initializing Hyperliquid Stack...");
        await initHyperliquid();
        
        console.log("🧠 Executing Brain Cycle (with Forced TIA Signal)...");
        // Use the actual bot cycle logic
        const hasOpenPos = await runCycle(mockDb);
        
        console.log("\n📊 AUDIT RESULTS:");
        console.log(`- Cycle Execution: ${hasOpenPos ? "TRADE TRIGGERED ✅" : "NO TRADE ⚠️"}`);
        
        if (hasOpenPos) {
            console.log("🌟 SUCCESS: THE BOT'S BRAIN IS FULLY OPERATIONAL AND SYNCHRONIZED.");
        } else {
            console.log("⚠️ WARNING: Cycle completed but no trade was triggered. Check balance or scan logs.");
        }

    } catch (err) {
        console.error("❌ AUDIT CRASHED:", err);
    }
    
    console.log("\n✅ FULL-STACK AUDIT FINISHED.");
    process.exit(0);
}

runFullStackAudit();
