import { initHyperliquid, getBalance, getOpenPositions, getAllTradableAssets } from './src/survival/hyperliquid.js';
import { loadWalletAccount } from './src/identity/wallet.js';

async function diagnose() {
    try {
        console.log("=== HyperScalperX HL Diagnostic ===");
        const account = loadWalletAccount();
        console.log(`Wallet: ${account.address}`);

        const { infoClient } = initHyperliquid();
        const [bal, pos, meta] = await Promise.all([
            getBalance(),
            getOpenPositions(),
            infoClient.meta()
        ]);

        console.log(`\nBalance: $${bal.accountValue.toFixed(2)} | Withdrawable: $${bal.withdrawable.toFixed(2)}`);

        console.log(`\nPositions: ${pos.length}`);
        pos.forEach(p => console.log(`- ${p.asset}: ${p.side} ${p.size} @ ${p.entryPrice}`));

        // Check for ANY open orders
        console.log("\nChecking for Open Orders...");
        const openOrders = await infoClient.openOrders({ user: account.address });
        console.log(`Orders found: ${openOrders.length}`);
        openOrders.forEach(o => console.log(`- ID: ${o.oid} | Asset: ${meta.universe[o.asset].name} | ${o.side} | Price: ${o.limitPx} | Size: ${o.sz}`));

        // Check HYPE Specifically
        const hypeIndex = meta.universe.findIndex(a => a.name === "HYPE");
        console.log(`\nHYPE Index: ${hypeIndex}`);
        if (hypeIndex !== -1) {
            const assetCtxs = await infoClient.assetCtxs();
            const ctx = assetCtxs[hypeIndex];
            console.log(`HYPE Stats: Price $${ctx.markPx} | 24h Vol $${ctx.dayNtlVlm}`);
        }

    } catch (e) {
        console.error("Diagnostic failed:", e);
    }
}

diagnose();
