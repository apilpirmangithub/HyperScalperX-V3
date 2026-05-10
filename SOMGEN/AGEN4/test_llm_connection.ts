import { ReasoningBridge } from './reasoning_bridge';

/**
 * 🧪 LLM-TO-SKILL CONNECTION TEST
 * Verifying that the natural language brain is correctly controlling the technical body.
 */

async function runConnectionTest() {
    console.log("--- STARTING LLM CONNECTION VERIFICATION ---\n");

    const bridge = new ReasoningBridge({ apiKey: "SIMULATED_KEY" });

    // Test Case 1: Positive Decision
    console.log("TEST 1: Sending positive LLM decision...");
    const decision1 = "After analyzing the whale inflow and RSI, I have decided to EXECUTE the trade on Standard Perp.";
    await bridge.translateAndExecute(decision1);

    console.log("\n--------------------------------------------\n");

    // Test Case 2: Negative Decision
    console.log("TEST 2: Sending cautious LLM decision...");
    const decision2 = "The FUD sentiment is too high right now. We should HOLD and wait for more data.";
    await bridge.translateAndExecute(decision2);

    console.log("\n--- VERIFICATION COMPLETE ---");
}

runConnectionTest();
