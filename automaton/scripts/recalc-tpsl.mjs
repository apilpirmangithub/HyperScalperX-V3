import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  // Script to calculate ATR-based TP/SL from live candles and apply
  await ssh.execCommand(`cat > /tmp/recalc_tpsl.mjs << 'EOF'
import { initHyperliquid, getCandles, getOpenPositions, getMidPrice, placeTPSLOrders, getOpenOrders, cancelOrder } from '/root/automaton/dist/survival/hyperliquid.js';
import { analyzeBreakout } from '/root/automaton/dist/survival/technicals.js';

async function main() {
  initHyperliquid();
  const positions = await getOpenPositions();
  
  for (const pos of positions) {
    console.log("\\n=== " + pos.asset + " " + pos.side + " ===");
    
    // Fetch 15m candles
    const candles = await getCandles(pos.asset, "15m", 250);
    console.log("Candles fetched:", candles.length);
    
    // Run breakout analysis to get ATR-based TP/SL
    const sig = analyzeBreakout(candles, 0, {
      volumeSurgeThreshold: 1.8,
      atrTpMultiplier: 2.0,
      atrSlMultiplier: 2.0,
      confBase: 40
    });
    
    const entry = pos.entryPrice;
    const isLong = pos.side === "LONG";
    const mid = await getMidPrice(pos.asset);
    
    // ATR-based dynamic TP/SL percentages
    const atrTpPct = sig.dynamicTP;
    const atrSlPct = sig.dynamicSL;
    
    // Calculate actual price levels
    const tpPrice = isLong ? entry * (1 + atrTpPct / 100) : entry * (1 - atrTpPct / 100);
    const softSlPrice = isLong ? entry * (1 - atrSlPct / 100) : entry * (1 + atrSlPct / 100);
    const nuclearBuffer = 5.0;
    const nuclearSlPrice = isLong ? entry * (1 - (atrSlPct + nuclearBuffer) / 100) : entry * (1 + (atrSlPct + nuclearBuffer) / 100);
    
    console.log(JSON.stringify({
      asset: pos.asset,
      entry: entry,
      currentPrice: mid,
      atrTpPct: atrTpPct.toFixed(3) + "%",
      atrSlPct: atrSlPct.toFixed(3) + "%",
      tpPrice: tpPrice.toFixed(6),
      softSlPrice: softSlPrice.toFixed(6),
      nuclearSlPrice: nuclearSlPrice.toFixed(6),
      distanceToTpPct: (isLong ? (tpPrice - mid) / mid * 100 : (mid - tpPrice) / mid * 100).toFixed(3) + "%",
      atrIndicators: {
        atr14: sig.indicators.atr14?.toFixed(6),
        volumeSurge: sig.indicators.volumeSurge?.toFixed(2)
      }
    }, null, 2));
  }
  
  process.exit(0);
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
EOF`);

  const result = await ssh.execCommand('node /tmp/recalc_tpsl.mjs');
  const output = result.stdout + '\n' + (result.stderr || '');
  console.log(output);
  fs.writeFileSync('atr_recalc.txt', output, 'utf8');

  ssh.dispose();
}

run().catch(console.error);
