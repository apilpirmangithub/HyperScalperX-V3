import { initHyperliquid, getMidPrice, placeMarketOrder, getOpenPositions, closePosition } from "../src/survival/hyperliquid";

async function runTest() {
    try {
        console.log("⚔️ STARTING BATTLE READINESS TEST (TS)...");
        
        console.log("\n[1] CONNECTING TO HYPERLIQUID...");
        await initHyperliquid();
        
        const asset = "TIA";
        const midPx = await getMidPrice(asset);
        console.log(`✅ CONNECTION SECURE. ${asset} Price: ${midPx}`);

        console.log(`\n[2] EXECUTING LIVE SIGNING: Market Buy 0.2 ${asset} (~$1)...`);
        const buyRes = await placeMarketOrder(asset, 0.2, true);
        
        if (buyRes.status === "ok") {
            console.log("✅ SIGNING & EXECUTION SUCCESSFUL!");
            console.log("⏳ Waiting for settlement...");
            await new Promise(r => setTimeout(r, 3000));
            
            const positions = await getOpenPositions();
            const pos = positions.find(p => p.asset === asset);
            
            if (pos) {
                console.log(`✅ POSITION DETECTED: ${pos.side} ${pos.size} ${asset}`);
                console.log(`\n[3] CLEANING UP: Market Sell 0.2 ${asset}...`);
                const closeRes = await closePosition(asset, pos.size, false);
                console.log("CLOSE RESPONSE:", JSON.stringify(closeRes, null, 2));
                console.log("\n🌟 TEST PASSED: SYSTEM IS BATTLE READY.");
            } else {
                console.log("⚠️ POSITION NOT FOUND. Check Explorer.");
            }
        } else {
            console.error("❌ TRADE FAILED:", buyRes);
        }
        
    } catch (err) {
        console.error("❌ TEST CRASHED:", err);
    }
    process.exit(0);
}

runTest();
