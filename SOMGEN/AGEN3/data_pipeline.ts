import fs from "fs";
import path from "path";

// 1. CryptoPanic Free API (News Aggregator)
const CRYPTOPANIC_API = "https://cryptopanic.com/api/v1/posts/?auth_token=public&public=true"; 

// 2. Reddit Public JSON API (CryptoCurrency Subreddit)
const REDDIT_API = "https://www.reddit.com/r/CryptoCurrency/hot.json?limit=10";

// 3. Alternative.me Fear & Greed Index
const FEAR_GREED_API = "https://api.alternative.me/fng/?limit=1";

async function fetchFearAndGreed() {
    try {
        console.log("🌡️ [AGEN3] Fetching Global Market Psychology...");
        const response = await fetch(FEAR_GREED_API);
        const data = await response.json();
        const value = parseInt(data.data[0].value);
        const classification = data.data[0].value_classification;
        console.log(`   👉 Fear & Greed Index: ${value} (${classification})`);
        return { value, classification };
    } catch (e: any) {
        console.error("❌ Error fetching Fear & Greed:", e.message);
        return null;
    }
}

async function fetchRedditHype() {
    try {
        console.log("\n👽 [AGEN3] Scanning Reddit (r/CryptoCurrency) for Retail Sentiment...");
        // Add a User-Agent to avoid Reddit blocking the generic fetch request
        const response = await fetch(REDDIT_API, {
            headers: { 'User-Agent': 'AGEN3_Bot/1.0' }
        });
        const data = await response.json();
        
        const posts = data.data.children.map((child: any) => child.data.title);
        
        console.log(`   ✅ Successfully scraped ${posts.length} trending discussions.`);
        
        // Simple mock analysis for demo purposes
        const keywordCounts = { AI: 0, SEC: 0, Bull: 0, Bear: 0, Scam: 0 };
        posts.forEach((title: string) => {
            const upper = title.toUpperCase();
            if (upper.includes("AI")) keywordCounts.AI++;
            if (upper.includes("SEC")) keywordCounts.SEC++;
            if (upper.includes("BULL")) keywordCounts.Bull++;
            if (upper.includes("BEAR")) keywordCounts.Bear++;
            if (upper.includes("SCAM") || upper.includes("HACK")) keywordCounts.Scam++;
        });

        console.log("   📊 Narrative Keywords Detected:", keywordCounts);
        return posts.slice(0, 3); // Return top 3 for the report
    } catch (e: any) {
        console.error("❌ Error scanning Reddit:", e.message);
        return null;
    }
}

async function fetchGlobalNews() {
    try {
        console.log("\n📰 [AGEN3] Aggregating Global Crypto News (CryptoPanic)...");
        // Using a public endpoint trick or free proxy if auth_token=public doesn't work.
        // Actually CryptoPanic requires a free token. Since we don't have one, we will use an alternative free news feed or just show the structure.
        // Instead, let's use the free CoinDesk/CoinTelegraph RSS or a public API.
        // For demonstration, let's fetch a known public API: Messari or just simulate news if no key is present.
        
        // As a robust alternative without keys, we can use the public LunarCrush or CoinGecko status updates API.
        const COINGECKO_STATUS = "https://api.coingecko.com/api/v3/status_updates";
        
        const response = await fetch(COINGECKO_STATUS);
        const data = await response.json();
        
        const updates = data.status_updates.slice(0, 3).map((u: any) => ({
            project: u.project.name,
            update: u.description.substring(0, 80) + "..."
        }));

        console.log("   ✅ Real-time Project Updates Scraped:");
        updates.forEach((u: any, i: number) => console.log(`      ${i+1}. [${u.project}] ${u.update}`));
        
        return updates;
    } catch (e: any) {
        console.error("❌ Error fetching News:", e.message);
        return null;
    }
}

async function runAgen3Synthesis() {
    console.log("=========================================");
    console.log("🌍 AGEN3: OFF-CHAIN & FUNDAMENTAL ANALYST");
    console.log("=========================================\n");

    const psychology = await fetchFearAndGreed();
    const redditHype = await fetchRedditHype();
    const news = await fetchGlobalNews();

    console.log("\n=========================================");
    console.log("🧠 SYNTHESIS RESULT (JSON DIRECTIVE)");
    console.log("=========================================");

    const directive = {
        timestamp: new Date().toISOString(),
        market_psychology: psychology ? psychology.classification.toUpperCase().replace(/ /g, "_") : "NEUTRAL",
        fear_greed_score: psychology ? psychology.value : 50,
        social_hype_alerts: redditHype && redditHype.length > 0 ? "ACTIVE_DISCUSSIONS" : "QUIET",
        top_reddit_topics: redditHype,
        latest_fundamental_news: news,
        system_killswitch: false // Would be true if "HACK" or "CRASH" dominated the news
    };

    console.log(JSON.stringify(directive, null, 2));

    const dirPath = path.resolve("./AGEN3_OUTPUT");
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);
    fs.writeFileSync(path.join(dirPath, "fundamental_directive.json"), JSON.stringify(directive, null, 2));
    console.log("\n✅ Directive saved to AGEN3_OUTPUT/fundamental_directive.json");
}

runAgen3Synthesis().catch(console.error);
