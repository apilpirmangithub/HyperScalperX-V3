import { SocialScraper } from './social_scraper';

/**
 * 🧪 REAL-WORLD SCRAPING TEST
 * Verifying that AGEN3 can capture actual news evidence from the web.
 */

async function runScrapingTest() {
    console.log("--- STARTING REAL-TIME SCRAPING TEST ---");
    console.log("Status: AGEN3 is opening a live browser to search for Somnia news...");

    const scraper = new SocialScraper();
    const result = await scraper.scrapeSomniaSentiment();

    if (result.status === "SUCCESS") {
        console.log("\n✅ SUCCESS: Evidence captured and saved!");
        console.log(`Path: ${result.path}`);
    } else {
        console.log("\n❌ FAILED: Scraping process encountered an error.");
    }

    console.log("--- TEST COMPLETE ---");
}

runScrapingTest();
