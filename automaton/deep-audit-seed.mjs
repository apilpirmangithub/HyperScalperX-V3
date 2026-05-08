import { ethers } from 'ethers';
// Note: We use ethers for EVM. For Solana/BTC we'd need other libs, 
// but we can check common EVM derivation paths first.

const mnemonic = "future sick arctic wink this cancel crew citizen fiber host rapid earn milk divorce wish";

async function deepAuditSeed() {
    console.log('🕵️ Deep Audit for XDEFI Seed Phrase (15 words)...\n');
    
    try {
        // 1. Check Standard Ethereum Path
        const ethWallet = ethers.HDNodeWallet.fromPhrase(mnemonic, "", "m/44'/60'/0'/0/0");
        console.log('📍 Ethereum/EVM Address:', ethWallet.address);

        // 2. Check if it might be a different EVM path (often used by different wallets)
        const ethWalletAlt = ethers.HDNodeWallet.fromPhrase(mnemonic, "", "m/44'/60'/0'/0");
        console.log('📍 Alt EVM Path Address:', ethWalletAlt.address);

        // 3. Mention other chains that usually use 15 words
        console.log('\n📝 Info: 15-word mnemonics are common for:');
        console.log('- XDEFI Wallet (Multi-chain)');
        console.log('- Solana (sometimes uses 12/15/24)');
        console.log('- Older Bitcoin wallets');
        
        console.log('\n⚠️ PERINGATAN: Karena file ini tersimpan di Downloads, hacker kemungkinan besar sudah menguras semua koin (BTC, ETH, SOL, THOR) yang terhubung ke 15 kata ini.');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

deepAuditSeed();
