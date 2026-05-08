/**
 * Attempt Spot USDC Withdrawal from 0xBB5F... to safe address
 * Using the private key still stored on VPS
 */
import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

const WITHDRAW_SCRIPT = `
import { privateKeyToAccount } from 'viem/accounts';
import { parseUnits } from 'viem';
import fs from 'fs';

const DESTINATION = '0xAd2Cd3e21a4636cA9165f312C69d21bc941cb5D6';
const AMOUNT_USDC = 40.0; // withdraw ~40 USDC (leave tiny dust)

// Load private key
const wallet = JSON.parse(fs.readFileSync('/root/.automaton/wallet.json', 'utf-8'));
const account = privateKeyToAccount(wallet.privateKey);
console.log('Signing with:', account.address);

// Hyperliquid spot transfer (withdraw USDC to L1/another address)
// Using the withdrawFromBridge action
const timestamp = Date.now();
const amount = AMOUNT_USDC.toFixed(2);

// Build the spot withdrawal action
const action = {
  type: 'withdraw3',
  hyperliquidChain: 'Mainnet',
  signatureChainId: '0xa4b1', // Arbitrum
  destination: DESTINATION,
  amount: amount,
  time: timestamp
};

console.log('Action to sign:', JSON.stringify(action, null, 2));

// Sign using EIP-712
const domain = {
  name: 'HyperliquidSignTransaction',
  version: '1',
  chainId: 42161, // Arbitrum
  verifyingContract: '0x0000000000000000000000000000000000000000'
};

const types = {
  'HyperliquidTransaction:Withdraw': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'destination', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'time', type: 'uint64' }
  ]
};

const value = {
  hyperliquidChain: 'Mainnet',
  destination: DESTINATION,
  amount: amount,
  time: timestamp
};

// Sign with viem
const { createWalletClient, http } = await import('viem');
const { arbitrum } = await import('viem/chains');

const signature = await account.signTypedData({ domain, types, primaryType: 'HyperliquidTransaction:Withdraw', message: value });
console.log('Signature:', signature.slice(0, 20) + '...');

// Submit to Hyperliquid
const payload = {
  action,
  signature: {
    r: '0x' + signature.slice(2, 66),
    s: '0x' + signature.slice(66, 130),
    v: parseInt(signature.slice(130, 132), 16)
  },
  nonce: timestamp
};

const res = await fetch('https://api.hyperliquid.xyz/exchange', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const result = await res.json();
console.log('RESULT:', JSON.stringify(result, null, 2));
`;

// Write the script to VPS and run it
async function tryWithdraw() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 20000
        });
        console.log('✅ Connected to VPS\n');

        // Write script to VPS
        await ssh.execCommand(`cat > /tmp/try-withdraw.mjs << 'ENDOFSCRIPT'\n${WITHDRAW_SCRIPT}\nENDOFSCRIPT`);
        
        // Check if viem is available on VPS
        const viemCheck = await ssh.execCommand('ls /root/automaton/node_modules/viem 2>/dev/null && echo "EXISTS" || echo "MISSING"');
        console.log('Viem available:', viemCheck.stdout.trim());

        // Run from automaton dir where viem is installed
        console.log('\nAttempting withdrawal...');
        const result = await ssh.execCommand('cd /root/automaton && node /tmp/try-withdraw.mjs', { execOptions: { timeout: 30000 } });
        
        console.log('STDOUT:', result.stdout);
        if (result.stderr) console.log('STDERR:', result.stderr.slice(0, 500));
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

tryWithdraw();
