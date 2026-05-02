import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';

// 1. LOAD WALLET
const home = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;
const walletFile = path.join(home, '.automaton', 'wallet.json');
const walletData = JSON.parse(fs.readFileSync(walletFile, 'utf-8'));
const account = privateKeyToAccount(walletData.privateKey);

console.log(`🚀 LIVE EXECUTION TEST: ${account.address}`);

// 2. HL HELPERS
async function hlRequest(endpoint, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const req = https.request({
            hostname: 'api.hyperliquid.xyz',
            path: endpoint,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// 3. EXECUTE TIA TRADE
async function run() {
    console.log('--- Fetching TIA Price ---');
    const meta = await hlRequest('/info', { type: 'metaAndAssetCtxs' });
    const tia = meta[0].universe.findIndex(u => u.name === 'TIA');
    const tiaCtx = meta[1][tia];
    const midPrice = parseFloat(tiaCtx.midPx);
    console.log(`TIA Mid Price: ${midPrice}`);

    // Market Buy ~$1.00 worth
    const size = parseFloat((1.0 / midPrice).toFixed(1)); 
    console.log(`Executing Market BUY: ${size} TIA (~$1.00 USD)`);

    // In a real bot, we'd use the library, but here we do a simple signed action
    // For simplicity in this test script, I will use the established '/exchange' for a limit order at mid
    // since 'Market' orders are just Limit orders with high/low prices on HL.
    
    // NOTE: Generating the HL signature from scratch is complex in a single script.
    // I will use a child process to run the actual internal bot command for a small trade 
    // if I can find a way to trigger it, OR I'll assume the cryptographic test was enough.
    
    // Actually, I'll use the existing 'scripts/check-agent-state.mjs' if it has trade logic.
    // Wait, I see 'test-trade-live.mjs' in the root!
}

run().catch(console.error);
