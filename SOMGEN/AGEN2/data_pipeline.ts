import ccxt from "ccxt";
import fs from "fs";
import path from "path";

// DefiLlama API endpoints (Public & Free)
const DEFILLAMA_TVL_API = "https://api.llama.fi/v2/chains";

async function fetchDefiLlamaData() {
    try {
        console.log("🌊 [AGEN2] Fetching On-Chain TVL Data from DefiLlama...");
        const response = await fetch(DEFILLAMA_TVL_API);
        const data = await response.json();
        
        // Find top networks
        const topChains = data.slice(0, 5).map((chain: any) => ({
            name: chain.name,
            tvl: chain.tvl
        }));
        
        console.log("✅ [AGEN2] Top 5 Chain TVL Retrieved:");
        console.table(topChains);
        return topChains;
    } catch (error: any) {
        console.error("❌ [AGEN2] DefiLlama API Error:", error.message);
        return null;
    }
}

async function fetchDerivativesData(asset: string = "ETH") {
    try {
        console.log(`\n🔥 [AGEN2] Fetching Derivatives Data for ${asset} from Binance...`);
        const binance = new ccxt.binance({ options: { defaultType: 'future' } });
        
        // 1. Fetch Open Interest
        const oi = await binance.fetchOpenInterest(`${asset}/USDT:USDT`);
        
        // 2. Fetch Funding Rate
        const funding = await binance.fetchFundingRate(`${asset}/USDT:USDT`);
        
        // 3. (Optional) Let's just use funding and OI for now to avoid specific implicit method issues
        
        const derivativesInfo = {
            asset,
            openInterestAmount: oi.baseVolume || oi.openInterestAmount,
            openInterestValueUSD: (oi.baseVolume || oi.openInterestAmount) * funding.markPrice,
            fundingRate: funding.fundingRate * 100, // percentage
            longShortRatio: null // We will keep this null for now to ensure stability
        };

        console.log(`✅ [AGEN2] ${asset} Derivatives Metrics:`);
        console.log(`   - Open Interest (USD): $${(derivativesInfo.openInterestValueUSD / 1_000_000).toFixed(2)} Million`);
        console.log(`   - Funding Rate: ${derivativesInfo.fundingRate.toFixed(4)}%`);
        console.log(`   - Long/Short Ratio: ${derivativesInfo.longShortRatio}`);
        
        return derivativesInfo;
    } catch (error: any) {
        console.error("❌ [AGEN2] Binance API Error:", error.message);
        return null;
    }
}

async function synthesizeMacroBias() {
    console.log("=========================================");
    console.log("🤖 AGEN2: ON-CHAIN MACRO SYNTHESIZER");
    console.log("=========================================\n");

    const tvlData = await fetchDefiLlamaData();
    const ethDerivatives = await fetchDerivativesData("ETH");
    const solDerivatives = await fetchDerivativesData("SOL");

    console.log("\n=========================================");
    console.log("🧠 SYNTHESIS RESULT (JSON DIRECTIVE)");
    console.log("=========================================");
    
    // Simple logic for demonstration
    const ethBias = (ethDerivatives && ethDerivatives.fundingRate > 0) ? "BULLISH" : "BEARISH";
    
    const directive = {
        timestamp: new Date().toISOString(),
        assets: {
            "ETH": {
                onchain_bias: ethBias,
                funding_rate_warning: ethDerivatives && ethDerivatives.fundingRate > 0.05 ? "HIGH_SQUEEZE_RISK" : "NORMAL",
                open_interest_usd: ethDerivatives ? ethDerivatives.openInterestValueUSD : 0
            },
            "SOL": {
                onchain_bias: (solDerivatives && solDerivatives.fundingRate > 0) ? "BULLISH" : "BEARISH",
                funding_rate_warning: solDerivatives && solDerivatives.fundingRate > 0.05 ? "HIGH_SQUEEZE_RISK" : "NORMAL",
                open_interest_usd: solDerivatives ? solDerivatives.openInterestValueUSD : 0
            }
        },
        global_tvl_health: tvlData && tvlData[0].tvl > 100_000_000 ? "HEALTHY" : "DECLINING"
    };

    console.log(JSON.stringify(directive, null, 2));
    
    // Save to file for AGEN1 to read
    const dirPath = path.resolve("./AGEN2_OUTPUT");
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
    fs.writeFileSync(path.join(dirPath, "macro_directive.json"), JSON.stringify(directive, null, 2));
    console.log("\n✅ Directive saved to AGEN2_OUTPUT/macro_directive.json");
}

synthesizeMacroBias().catch(console.error);
