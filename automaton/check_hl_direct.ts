import { getBalance, getAllTradableAssets } from './src/survival/hyperliquid.js';
import { ethers } from 'ethers';

async function checkAccount() {
    console.log("🔍 Checking Hyperliquid Account Status...");
    try {
        const bal = await getBalance();
        console.log(`\n💰 Account Value: $${bal.accountValue.toFixed(2)}`);
        console.log(`💵 Withdrawable: $${bal.withdrawable.toFixed(2)}`);
        
        // Note: getBalance also returns positions in some versions, 
        // but let's assume we need to check positions separately if not included.
        // Actually, looking at common hyperliquid.js implementations:
        if (bal.positions) {
            console.log("\n📊 Open Positions:");
            bal.positions.forEach(p => {
                const side = parseFloat(p.s) > 0 ? "LONG" : "SHORT";
                console.log(`- ${p.coin}: ${side} | Size: ${p.s} | PnL: $${p.unrealizedPnl}`);
            });
        }
    } catch (e) {
        console.error("❌ Failed to fetch HL account status:", e.message);
    }
}

checkAccount();
