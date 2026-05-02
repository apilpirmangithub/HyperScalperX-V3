import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  await ssh.execCommand(`cat > /tmp/close_doge.mjs << 'EOF'
import { initHyperliquid, getOpenPositions, closePosition, getMidPrice } from '/root/automaton/dist/survival/hyperliquid.js';

async function main() {
  initHyperliquid();
  
  // 1. Get current DOGE position
  const positions = await getOpenPositions();
  const doge = positions.find(p => p.asset === "DOGE");
  
  if (!doge) {
    console.log("ERROR: No DOGE position found!");
    process.exit(1);
  }
  
  const mid = await getMidPrice("DOGE");
  const pnlPct = ((mid - doge.entryPrice) / doge.entryPrice * 100);
  
  console.log("BEFORE_CLOSE:" + JSON.stringify({
    asset: "DOGE",
    side: doge.side,
    size: doge.size,
    entry: doge.entryPrice,
    currentPrice: mid,
    pnlPct: pnlPct.toFixed(3) + "%",
    estPnlUsd: (pnlPct / 100 * doge.marginUsed * 10).toFixed(4)
  }));
  
  // 2. Close position (DOGE is LONG, so we sell/close with isBuy=false)
  console.log("Closing DOGE LONG position...");
  const result = await closePosition("DOGE", doge.size, false);
  console.log("CLOSE_RESULT:" + JSON.stringify(result));
  
  // 3. Update DB
  const Database = (await import("/root/automaton/node_modules/better-sqlite3")).default;
  const db = new Database("/root/.automaton/state.db");
  const trade = db.prepare("SELECT id FROM trades WHERE market = 'DOGE' AND status = 'open'").get();
  if (trade) {
    db.prepare("UPDATE trades SET status = 'closed', close_price = ?, close_time = ?, close_reason = 'atr_tp_manual', pnl_pct = ?, pnl_usdc = ? WHERE id = ?")
      .run(mid, new Date().toISOString(), pnlPct, pnlPct / 100 * doge.marginUsed * 10, trade.id);
    console.log("DB_UPDATED: Trade " + trade.id + " closed");
  }
  db.close();
  
  // 4. Verify
  const posAfter = await getOpenPositions();
  const dogeAfter = posAfter.find(p => p.asset === "DOGE");
  console.log("VERIFY: DOGE position " + (dogeAfter ? "STILL OPEN" : "CLOSED"));
  
  process.exit(0);
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
EOF`);

  const result = await ssh.execCommand('node /tmp/close_doge.mjs');
  const output = result.stdout + '\n' + (result.stderr || '');
  console.log(output);
  fs.writeFileSync('doge_close_result.txt', output, 'utf8');

  ssh.dispose();
}

run().catch(console.error);
