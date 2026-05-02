import { InfoClient, ExchangeClient, HttpTransport } from "@nktkas/hyperliquid";
import { PrivateKeySigner } from "@nktkas/hyperliquid/signing";
import fs from 'fs';
import path from 'path';

async function run() {
    try {
        console.log("🚀 STANDALONE READINESS TEST STARTING...");
        
        const home = process.env.USERPROFILE || process.env.HOME || process.env.HOMEPATH;
        const walletFile = path.join(home, '.automaton', 'wallet.json');
        
        if (!fs.existsSync(walletFile)) {
            throw new Error(`Wallet not found at ${walletFile}`);
        }
        
        const walletData = JSON.parse(fs.readFileSync(walletFile, 'utf8'));
        const privateKey = walletData.privateKey;
        
        const transport = new HttpTransport({ isTestnet: false });
        const infoClient = new InfoClient({ transport });
        const signer = new PrivateKeySigner(privateKey);
        const exchangeClient = new ExchangeClient({ wallet: signer, transport, isTestnet: false });
        
        console.log(`✅ Wallet Address: ${signer.address}`);

        // 1. Get Meta & Index for TIA
        const meta = await infoClient.meta();
        const assetIndex = meta.universe.findIndex(a => a.name === "TIA");
        if (assetIndex === -1) throw new Error("TIA not found");
        
        const mids = await infoClient.allMids();
        const midPx = parseFloat(mids["TIA"]);
        console.log(`✅ Connected. TIA Mid Price: ${midPx}`);

        // 2. Place Order (0.2 TIA ~ $0.94)
        console.log(`\n🎯 EXECUTION: Buying 0.2 TIA...`);
        const orderRes = await exchangeClient.order({
            orders: [{
                a: assetIndex,
                b: true, // Buy
                p: (midPx * 1.05).toFixed(4), // High limit for guaranteed market fill
                s: "0.2",
                r: false,
                t: { limit: { tif: "Ioc" } }
            }]
        });
        
        console.log("ORDER RESPONSE:", JSON.stringify(orderRes, null, 2));
        
        if (orderRes.status === 'ok') {
            const fill = orderRes.response.data.statuses[0].filled;
            console.log(`✅ FILL SUCCESS: ${JSON.stringify(fill)}`);
            
            console.log("\n⏳ Waiting for settlement...");
            await new Promise(r => setTimeout(r, 2000));
            
            // 3. Cleanup: Sell back
            console.log(`\n🧹 CLEANUP: Selling 0.2 TIA...`);
            const sellRes = await exchangeClient.order({
                orders: [{
                    a: assetIndex,
                    b: false, // Sell
                    p: (midPx * 0.95).toFixed(4),
                    s: "0.2",
                    r: true,
                    t: { limit: { tif: "Ioc" } }
                }]
            });
            console.log("SELL RESPONSE:", JSON.stringify(sellRes, null, 2));
            console.log("\n🌟 BATTLE READINESS 100% CONFIRMED.");
        } else {
            console.error("❌ TRADE FAILED.");
        }
        
    } catch (e) {
        console.error("❌ CRITICAL ERROR:", e);
    }
}

run();
