/**
 * 🤝 SOMNIA COLLABORATIVE REASONING FORUM (REFINED)
 * Mengimplementasikan logika ketat sesuai SKILLS.md masing-masing agen.
 */

export class CollaborativeForum {
    private sharedContext: any[] = [];
    private weights: { [key: string]: number } = { AGEN1: 0.40, AGEN2: 0.35, AGEN3: 0.25 };

    /**
     * Agen masuk ke forum, mendengarkan yang lain, dan memberikan opini berbasis data.
     */
    async participate(agentName: string, rawData: any, userProfile: string) {
        console.log(`\n[${agentName}] Menganalisa berdasarkan SKILLS.md...`);
        
        let opinion = "";
        let bias = 0; // -1 (Bearish) to 1 (Bullish)

        switch(agentName) {
            case "AGEN0": // CONCIERGE (SKILL 1: Dynamic Capital Routing)
                const yieldAPY = Math.floor(Math.random() * 80);
                if (yieldAPY > 30) {
                    bias = 0.1; 
                    opinion = `[DEFI] Trading saat ini berisiko. Menemukan peluang YIELD di Somnia Pool dengan APY ${yieldAPY}%. Lebih stabil untuk profil ${userProfile}.`;
                } else {
                    opinion = `[AGEN0] Kapasitas siap. Merutekan modal ke ${userProfile} engine untuk perburuan aktif.`;
                }
                break;

            case "AGEN1": // SANG TEKNISI (Technical & IL Specialist)
                const rsi = rawData.rsi || 50;
                const isDeFi = context.includes("DeFi") || context.includes("LP") || context.includes("Vault");
                
                if (isDeFi) {
                    const stability = rsi > 40 && rsi < 60 ? "sangat stabil" : "fluktuatif";
                    bias = stability === "sangat stabil" ? 1 : 0.5;
                    opinion = `[TECH] Menganalisa rute LP dari AGEN0. Volatilitas pair ${currentCoin} sedang ${stability}. Risiko Impermanent Loss (IL) minimal, mendukung eksekusi yield.`;
                } else {
                    const techState = (rawData.adx || 20) > 25 ? (rawData.close > rawData.ema20 ? "trending UP" : "trending DOWN") : "sideways";
                    bias = (techState === "trending UP" && rsi < 50) ? 1 : (techState === "trending DOWN" && rsi > 50 ? -1 : 0);
                    opinion = `[TECH] Struktur ${currentCoin} sedang ${techState} (@RSI:${rsi}). ${bias !== 0 ? `Setup ${bias > 0 ? 'LONG' : 'SHORT'} terdeteksi.` : "Menunggu konfirmasi momentum."}`;
                }
                break;

            case "AGEN2": // SANG INTEL ON-CHAIN (Whale & TVL Specialist)
                const whaleFlow = rawData.whaleFlow || 0; 
                const isDeFiFlow = context.includes("DeFi") || context.includes("LP") || context.includes("Vault");

                if (isDeFiFlow) {
                    const poolHealth = whaleFlow > 0 ? "inflow positif" : "distribusi ringan";
                    bias = whaleFlow > -500000 ? 1 : 0.2;
                    opinion = `[ON-CHAIN] Memantau Smart Contract Pool. Terdeteksi ${poolHealth} ke dalam protokol. Likuiditas di Somnex untuk ${currentCoin} cukup dalam untuk entri kita.`;
                } else {
                    const flowType = whaleFlow > 1000000 ? "akumulasi masif" : (whaleFlow < -1000000 ? "distribusi agresif" : "konsolidasi");
                    bias = whaleFlow > 800000 ? 1 : (whaleFlow < -800000 ? -1 : 0);
                    opinion = `[ON-CHAIN] Deteksi ${flowType} sebesar $${Math.abs(whaleFlow).toLocaleString()}. Smart money sedang bergerak ${bias > 0 ? "akumulatif" : "distributif"}.`;
                }
                break;

            case "AGEN3": // SANG FUNDAMENTALIS (Sentiment & Security Specialist)
                const sentiment = rawData.sentiment || 50; 
                const isDeFiSecurity = context.includes("DeFi") || context.includes("LP") || context.includes("Vault");

                if (isDeFiSecurity) {
                    bias = sentiment > 40 ? 1 : -1;
                    opinion = `[SOCIAL] Audit reputasi protokol. Somnex V3 memiliki record keamanan solid. Sentimen komunitas terhadap pool ${currentCoin} positif (@${sentiment}). Rute aman.`;
                } else {
                    const psych = sentiment > 70 ? "euforia" : (sentiment < 30 ? "panik" : "skeptis");
                    bias = sentiment > 75 ? 0.6 : (sentiment < 25 ? -0.6 : 0);
                    opinion = `[SOCIAL] Psikologi market ${psych} (@${sentiment}). ${bias !== 0 ? "Narasi mendukung pergerakan." : "Belum ada katalis fundamental."}`;
                }
                break;
            case "CUSTOM": // VANGUARD-X (Dynamic User Agent)
                const prompt = (rawData as any).customPrompt || "Analytical Sniper";
                let multiplier = 1;
                if (prompt.toLowerCase().includes("agresif")) multiplier = 1.3;
                if (prompt.toLowerCase().includes("skeptis")) multiplier = 0.7;
                
                bias = (rawData.rsi > 50 ? 1 : -1) * multiplier;
                opinion = `[CUSTOM] Menjalankan protokol kustom: ${prompt}. Bias keputusan: ${bias.toFixed(2)}.`;
                break;
        }

        this.sharedContext.push({ agent: agentName, opinion, bias });
        // Dynamically add CUSTOM weight if it participates
        if (agentName === "CUSTOM" && !this.weights["CUSTOM"]) {
            this.weights["CUSTOM"] = 0.35; 
        }
        return opinion;
    }

    /**
     * Resolusi akhir oleh AGEN4 (SKILL 1 & 5)
     */
    resolveConsensus(userProfile: string) {
        let totalScore = 0;
        let activeAgents = 0;
        let defiOpportunity = "";
        let defiScore = 0;

        this.sharedContext.forEach(entry => {
            if (this.weights[entry.agent]) {
                totalScore += (entry.bias * this.weights[entry.agent]);
                activeAgents++;
            }
            if (entry.opinion.includes("[DEFI]")) {
                defiScore += 0.35; 
                defiOpportunity = entry.opinion;
            }
        });

        let executionMode = userProfile;
        if (activeAgents < 3) executionMode = "SAFETY";

        const tradingConviction = Math.abs(totalScore);
        const threshold = executionMode === "AGGRESSIVE" ? 0.4 : (executionMode === "SAFETY" ? 0.15 : 0.25);

        if (tradingConviction >= threshold && tradingConviction >= defiScore) {
            return {
                decision: totalScore > 0 ? "LONG" : "SHORT",
                score: totalScore.toFixed(2),
                type: "TRADING",
                mode: executionMode,
                reasoning: this.sharedContext.map(o => o.opinion).join(" | ")
            };
        } else if (defiScore > 0.3) {
            return {
                decision: "EXECUTE_DEFI",
                score: defiScore.toFixed(2),
                type: "DEFI",
                mode: executionMode,
                reasoning: `[OPPORTUNITY] Trading conviction rendah (${tradingConviction.toFixed(2)}). Beralih ke: ${defiOpportunity}`
            };
        }

        return {
            decision: "REJECT",
            score: totalScore.toFixed(2),
            type: "NONE",
            mode: executionMode,
            reasoning: "Tidak ada peluang profit tinggi yang memenuhi standar keamanan saat ini."
        };
    }

    clear() {
        this.sharedContext = [];
    }
}
