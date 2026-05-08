import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';

const mnemonic = "future sick arctic wink this cancel crew citizen fiber host rapid earn milk divorce wish";

async function deriveSolana() {
    console.log('🕵️ Deriving Solana address from 15-word mnemonic...\n');
    
    try {
        const seed = await bip39.mnemonicToSeed(mnemonic);
        
        // Solana standard derivation path: m/44'/501'/0'/0'
        const derivedKey = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
        const keypair = Keypair.fromSeed(derivedKey);
        
        console.log('--- SOLANA ADDRESS ---');
        console.log('Address:', keypair.publicKey.toBase58());
        
        console.log('\n🔍 Check this address on https://solscan.io');

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

deriveSolana();
