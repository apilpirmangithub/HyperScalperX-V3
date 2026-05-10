import { CollaborativeForum } from './collaborative_reasoning';

/**
 * 🎭 DYNAMIC DEBATE TEST
 * Proving that agents change their opinions and responses 
 * based on changing market conditions and peer arguments.
 */

async function runDynamicTest() {
    console.log("=== SESSION 1: THE IDEAL BULLISH CASE ===");
    const forum1 = new CollaborativeForum();
    const data1 = { rsi: 30, whaleInflow: 2000000 };

    await forum1.participate("AGEN1", data1);
    await forum1.participate("AGEN2", data1);
    await forum1.participate("AGEN3", data1);
    console.log(JSON.stringify(forum1.getFinalConsensus(), null, 2));

    console.log("\n\n=== SESSION 2: THE CONTRADICTION CASE ===");
    const forum2 = new CollaborativeForum();
    const data2 = { rsi: 30, whaleInflow: -5000000 }; // RSI same, but Whales are DUMPING

    await forum2.participate("AGEN1", data2);
    await forum2.participate("AGEN2", data2);
    await forum2.participate("AGEN3", data2);
    console.log(JSON.stringify(forum2.getFinalConsensus(), null, 2));

    console.log("\nTEST COMPLETE: Observe how AGEN2 and AGEN3 changed their stance based on the new data!");
}

runDynamicTest();
