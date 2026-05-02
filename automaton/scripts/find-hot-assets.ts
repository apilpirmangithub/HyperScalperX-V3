/**
 * SULTAN MARKET RADAR: HIGH VOLUME SCANNER 📡🏹🌪️
 * Scans all Hyperliquid assets to find the most active ones RIGHT NOW.
 */

import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";

async function scanMarket() {
    console.log("📡 SULTAN RADAR: SCANNING HYPERLIQUID MARKET...");
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });

    try {
        const [meta, contexts] = await info.metaAndAssetCtxs();
        const assetData = meta.universe.map((asset, i) => {
            const ctx = contexts[i];
            const vol = parseFloat(ctx.dayNtlVlm);
            const markPrice = parseFloat(ctx.markPx);
            return {
                name: asset.name,
                volume24h: vol,
                price: markPrice,
                funding: parseFloat(ctx.funding) * 100 * 24 * 365, // Annualized
            };
        });

        // Sort by Volume 24h (as proxy for current activity)
        const hotAssets = assetData.sort((a, b) => b.volume24h - a.volume24h).slice(0, 20);

        console.log("\n🔥 TOP 20 HOT ASSETS BY VOLUME (USD):");
        console.log("--------------------------------------------------");
        hotAssets.forEach((a, i) => {
            const isElite = ["MEME", "DOGE", "ADA", "TIA", "AVAX", "OP", "INJ", "ARB"].includes(a.name) ? "⭐" : "  ";
            console.log(`${(i+1).toString().padStart(2, ' ')}. ${isElite} ${a.name.padEnd(8)} | Vol: $${(a.volume24h/1000000).toFixed(1)}M | Price: $${a.price.toFixed(4)} | Funding: ${a.funding.toFixed(2)}%/yr`);
        });
        console.log("--------------------------------------------------");
        console.log("⭐ = Asset sudah masuk dalam Elite-8 Sultan.");

    } catch (e) {
        console.error("❌ Radar Error:", e);
    }
}

scanMarket();
