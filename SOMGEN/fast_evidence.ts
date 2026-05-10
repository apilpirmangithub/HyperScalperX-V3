import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * 🛰️ GLOBAL EVIDENCE COMMANDER
 * Orchestrates real-time visual proof for all Somgen agents.
 */

const SCREENSHOT_KEY = "7d86f7"; // Public API Key

async function captureEvidence(agentName: string, targetUrl: string) {
    console.log(`[${agentName}] 📸 Capturing live evidence from: ${targetUrl}`);
    
    const apiUrl = `https://api.screenshotmachine.com/?key=${SCREENSHOT_KEY}&url=${encodeURIComponent(targetUrl)}&dimension=1024x768`;
    const outputPath = path.join(process.cwd(), agentName, `${agentName}_OUTPUT`, 'evidence.png');
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    try {
        const response = await axios({ url: apiUrl, method: 'GET', responseType: 'stream' });
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        // ALSO COPY TO UI FOLDER FOR BROWSER ACCESS
        const uiPath = path.join(process.cwd(), 'UI', `evidence_${agentName.toLowerCase()}.png`);
        const uiWriter = fs.createWriteStream(uiPath);
        response.data.pipe(uiWriter);

        return new Promise((resolve) => {
            writer.on('finish', () => {
                console.log(`[${agentName}] ✅ EVIDENCE SYNCED TO UI FOLDER: ${uiPath}`);
                resolve(true);
            });
        });
    } catch (e) {
        console.error(`[${agentName}] ❌ SYNC FAILED.`);
    }
}

async function syncAllAgents() {
    console.log("--- STARTING GLOBAL VISUAL SYNC ---\n");
    
    // 1. AGEN1: Live Chart
    await captureEvidence("AGEN1", "https://dexscreener.com/somnia"); 

    // 2. AGEN2: Whale Tracker
    await captureEvidence("AGEN2", "https://somniascan.io/txs");

    // 3. AGEN3: Social Sentiment
    await captureEvidence("AGEN3", "https://cryptopanic.com/news/somnia/");

    console.log("\n--- ALL MONITORS ARMED WITH REAL DATA ---");
}

syncAllAgents();
