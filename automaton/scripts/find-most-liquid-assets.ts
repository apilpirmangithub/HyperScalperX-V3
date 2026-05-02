/**
 * SULTAN HISTORICAL VOLUME SCANNER 📜🏹🌪️
 * Analyzes the last 90 days of volume for all assets to find the "True Kings" of liquidity.
 */

import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import * as fs from 'fs';

const LOOKBACK_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

async function scanHistoricalVolume() {
    console.log(`📜 SULTAN RADAR: ANALYZING LAST ${LOOKBACK_DAYS} DAYS OF MARKET DATA...`);
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });

    try {
        const [meta, contexts] = await info.metaAndAssetCtxs();
        const endTime = Date.now();
        const startTime = endTime - (LOOKBACK_DAYS * DAY_MS);

        const results: any[] = [];
        
        // Let's filter first by current volume to avoid fetching low-liquid trash
        const candidates = universe.filter((a, i) => parseFloat(contexts[i].dayNtlVlm) > 5000000); // Only > $5M today

        console.log(`🔍 Checking ${candidates.length} liquid candidates for long-term consistency...`);

        for (const asset of candidates) {
            process.stdout.write(`Analyzing ${asset.name}... `);
            try {
                const candles = await info.candleSnapshot({
                    coin: asset.name,
                    interval: "1d",
                    startTime,
                    endTime
                }) as any[];

                if (candles && candles.length > 30) {
                    const volumes = candles.map(c => parseFloat(c.v) * parseFloat(c.c));
                    const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
                    
                    // Consistency check: coefficient of variation (standard deviation / mean)
                    const mean = avgVol;
                    const squareDiffs = volumes.map(v => Math.pow(v - mean, 2));
                    const variance = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
                    const stdDev = Math.sqrt(variance);
                    const cv = (stdDev / mean) * 100; // Percentage

                    results.push({
                        name: asset.name,
                        avgVol,
                        consistency: 100 - cv, // Higher is more consistent
                        currentPrice: parseFloat(candles[candles.length-1].c)
                    });
                    console.log(`Avg: $${(avgVol/1000000).toFixed(1)}M | Stability: ${(100-cv).toFixed(1)}%`);
                } else {
                    console.log("Not enough history.");
                }
            } catch (e) {
                console.log("Error.");
            }
            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 100));
        }

        const topStable = results.sort((a, b) => b.avgVol - a.avgVol).slice(0, 20);

        console.log("\n💎 TOP 20 TRUE KINGS OF LIQUIDITY (90 Days Avg):");
        console.log("------------------------------------------------------------------");
        console.log("RANK | ASSET    | AVG VOL (90D) | STABILITY | CURRENT PRICE");
        console.log("------------------------------------------------------------------");
        topStable.forEach((a, i) => {
            const isElite = ["MEME", "DOGE", "ADA", "TIA", "AVAX", "OP", "INJ", "ARB"].includes(a.name) ? "⭐" : "  ";
            console.log(`${(i+1).toString().padStart(2, ' ')}. ${isElite} ${a.name.padEnd(8)} | $${(a.avgVol/1000000).toFixed(1).padStart(5)}M      | ${a.consistency.toFixed(1).padStart(5)}%     | $${a.currentPrice.toFixed(4)}`);
        });
        console.log("------------------------------------------------------------------");
        console.log("⭐ = Anggota Elite-8 Sultan.");

        fs.writeFileSync('./liquid_assets_summary.json', JSON.stringify(topStable, null, 2));
        console.log("\n✅ Laporan lengkap tersimpan di ./liquid_assets_summary.json");

    } catch (e) {
        console.error("❌ Scanner Error:", e);
    }
}

// Global scope fix for meta access
let universe: any[] = [];
(async () => {
    const transport = new HttpTransport();
    const info = new InfoClient({ transport });
    const meta = await info.meta();
    universe = meta.universe;
    await scanHistoricalVolume();
})();
