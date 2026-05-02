import { InfoClient, ExchangeClient, HttpTransport } from "@nktkas/hyperliquid";
import { PrivateKeySigner } from "@nktkas/hyperliquid/signing";
import fs from 'fs';
import path from 'path';

async function fastProof() {
    try {
        console.log("⚡ FAST PROOF STARTING (VPS)...");
        
        const home = "/root";
        const walletFile = path.join(home, '.automaton', 'wallet.json');
        
        if (!fs.existsSync(walletFile)) {
            throw new Error(`Wallet not found at ${walletFile}`);
        }
        
        const walletData = JSON.parse(fs.readFileSync(walletFile, 'utf8'));
        const privateKey = walletData.privateKey;
        
        const transport = new HttpTransport({ isTestnet: false });
        const signer = new PrivateKeySigner(privateKey);
        const exchangeClient = new ExchangeClient({ wallet: signer, transport, isTestnet: false });
        const infoClient = new InfoClient({ transport });
        
        console.log(`✅ VERIFIED ADDRESS: ${signer.address}`);

        const mids = await infoClient.allMids();
        const midPx = parseFloat(mids["TIA"]);
        console.log(`✅ CONNECTED. TIA PRICE: ${midPx}`);

        console.log(`\n🎯 EXECUTING BATTLE READINESS: Buying 0.1 TIA...`);
        const meta = await infoClient.meta();
        const assetIndex = meta.universe.findIndex(a => a.name === "TIA");
        
        const orderRes = await exchangeClient.order({
            orders: [{
                a: assetIndex,
                b: true,
                p: (midPx * 1.1).toFixed(4), // Overbid for guaranteed market fill
                s: "0.1",
                r: false,
                t: { limit: { tif: "Ioc" } }
            }]
        });
        
        console.log("ORDER RESPONSE:", JSON.stringify(orderRes, null, 2));
        
        if (orderRes.status === 'ok') {
            const fill = orderRes.response.data.statuses[0].filled;
            console.log(`✅ FILL SUCCESS: ${JSON.stringify(fill)}`);
            
            console.log("\n🧹 CLEANUP: Selling 0.1 TIA...");
            const sellRes = await exchangeClient.order({
                orders: [{
                    a: assetIndex,
                    b: false,
                    p: (midPx * 0.9).toFixed(4),
                    s: "0.1",
                    r: true,
                    t: { limit: { tif: "Ioc" } }
                }]
            });
            console.log("SELL RESPONSE:", JSON.stringify(sellRes, null, 2));
            console.log("\n🌟 VPS BATTLE READINESS: 100% CONFIRMED.");
        } else {
            console.error("❌ TRADE FAILED.");
        }
        
    } catch (e) {
        console.error("❌ ERROR:", e.message);
    }
}

fastProof();
