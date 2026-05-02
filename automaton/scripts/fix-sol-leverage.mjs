import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  // Write script to set SOL leverage to 10x
  await ssh.execCommand(`cat > /tmp/fix_sol_leverage.mjs << 'EOF'
import { initHyperliquid } from '/root/automaton/dist/survival/hyperliquid.js';

async function main() {
  const { infoClient, exchangeClient } = initHyperliquid();
  
  // Find SOL asset index
  const meta = await infoClient.meta();
  const solAsset = meta.universe.findIndex(a => a.name === "SOL");
  console.log("SOL asset index:", solAsset);
  
  if (solAsset < 0) {
    console.log("ERROR: SOL not found in universe!");
    process.exit(1);
  }
  
  // Set leverage to 10x cross
  console.log("Setting SOL leverage to 10x (cross)...");
  const result = await exchangeClient.updateLeverage({ 
    asset: solAsset, 
    isCross: true, 
    leverage: 10 
  });
  console.log("Result:", JSON.stringify(result));
  
  // Verify
  const address = "0xBB5F9cDF24BdFAc0A1eBB63faa35900d9b5313c9";
  const state = await infoClient.clearinghouseState({ user: address });
  const solPos = state.assetPositions.find(p => p.position.coin === "SOL");
  if (solPos) {
    console.log("SOL Position After:", JSON.stringify({
      coin: solPos.position.coin,
      leverage: solPos.position.leverage,
      size: solPos.position.szi,
      entryPx: solPos.position.entryPx
    }));
  }
  
  process.exit(0);
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
EOF`);

  const result = await ssh.execCommand('node /tmp/fix_sol_leverage.mjs');
  const output = result.stdout + '\n' + result.stderr;
  console.log(output);
  fs.writeFileSync('sol_leverage_fix.txt', output, 'utf8');

  ssh.dispose();
}

run().catch(console.error);
