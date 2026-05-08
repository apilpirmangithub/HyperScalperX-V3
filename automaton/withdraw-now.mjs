import { privateKeyToAccount } from '/root/automaton/node_modules/viem/_esm/accounts/index.js';
import fs from 'fs';

const DESTINATION = '0xAd2Cd3e21a4636cA9165f312C69d21bc941cb5D6';
const wallet = JSON.parse(fs.readFileSync('/root/.automaton/wallet.json', 'utf-8'));
const account = privateKeyToAccount(wallet.privateKey);
console.log('Signer:', account.address);

const timestamp = Date.now();
const amount = '40.0';

const domain = {
  name: 'HyperliquidSignTransaction',
  version: '1',
  chainId: 42161,
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

const signature = await account.signTypedData({ domain, types, primaryType: 'HyperliquidTransaction:Withdraw', message: value });
const r = '0x' + signature.slice(2, 66);
const s = '0x' + signature.slice(66, 130);
const v = parseInt(signature.slice(130, 132), 16);

const payload = {
  action: { type: 'withdraw3', hyperliquidChain: 'Mainnet', signatureChainId: '0xa4b1', destination: DESTINATION, amount, time: timestamp },
  signature: { r, s, v },
  nonce: timestamp
};

console.log('Submitting withdrawal...');
const res = await fetch('https://api.hyperliquid.xyz/exchange', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
const result = await res.json();
console.log('RESULT:', JSON.stringify(result, null, 2));
