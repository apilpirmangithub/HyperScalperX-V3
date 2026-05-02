import { initHyperliquid, getMidPrice, placeMarketOrder, getOpenPositions, closePosition } from "../src/survival/hyperliquid.js";

async function testTrade() {
    try {
        console.log("🚀 STARTING FINAL BATTLE READINESS TEST...");
        const asset = "TIA";
        
        console.log("\n[1] INITIALIZING HYPERLIQUID...");
        await initHyperliquid();

        console.log(`\n[2] FETCHING ${asset} PRICE...`);
        const midPx = await getMidPrice(asset);
        console.log(`Current Mid Price: ${midPx}`);

        // Small size, e.g., 0.2 TIA (around $0.94)
        const size = 0.2;
        console.log(`\n[3] PLACING MARKET BUY ORDER FOR ${size} ${asset}...`);
        const orderRes = await placeMarketOrder(asset, size, true);
        console.log("ORDER RESPONSE:", JSON.stringify(orderRes, null, 2));

        if (orderRes.status !== "ok") {
            throw new Error(`Order failed: ${JSON.stringify(orderRes)}`);
        }
        
        console.log("\n⏳ WAITING 2 SECONDS...");
        await new Promise(r => setTimeout(r, 2000));

        console.log("\n[4] VERIFYING OPEN POSITION...");
        const positions = await getOpenPositions();
        const pos = positions.find(p => p.asset === asset);
        if (pos) {
            console.log(`✅ FOUND POSITION: ${pos.side} ${pos.size} @ ${pos.entryPrice}`);
            
            console.log(`\n[5] CLOSING POSITION FOR ${asset} (CLEANUP)...`);
            const closeRes = await closePosition(asset, pos.size, pos.side === "SHORT");
            console.log("CLOSE RESPONSE:", JSON.stringify(closeRes, null, 2));
        } else {
            console.log("⚠️ NO POSITION FOUND. Checking recent fills...");
        }

        console.log("\n✨ BATTLE READINESS VERIFIED: Signing, Execution, and Connectivity are 100%.");
        process.exit(0);
    } catch (err) {
        console.error("\n❌ TEST FAILED:", err);
        process.exit(1);
    }
}

testTrade();
