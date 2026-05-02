import { initHyperliquid, getMainWalletAddress } from './dist/survival/hyperliquid.js';

async function dump() {
    const { infoClient } = initHyperliquid();
    const address = getMainWalletAddress();
    console.log("Address:", address);
    const data = await infoClient.clearinghouseState({ user: address });
    console.log("RAW_DATA:", JSON.stringify(data, null, 2));
}

dump().catch(console.error);
