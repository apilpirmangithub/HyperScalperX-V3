import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  const remoteScript = `
    import { initHyperliquid, getOpenPositions, closePosition, getMidPrice, getOpenOrders, cancelOrder } from '/root/automaton/dist/survival/hyperliquid.js';
    import Database from '/root/automaton/node_modules/better-sqlite3/lib/index.js';
    const db = new Database('/root/.automaton/state.db');
    
    async function closeSol() {
      await initHyperliquid();
      
      // 1. Check position
      const positions = await getOpenPositions();
      const sol = positions.find(p => p.asset === "SOL");
      if (!sol) {
        console.log("No SOL position found (already closed?)");
        process.exit(0);
      }
      
      const mid = await getMidPrice("SOL");
      const pnlPct = ((mid - sol.entryPrice) / sol.entryPrice * 100);
      
      console.log('---CLOSING_SOL---');
      console.log(JSON.stringify({ 
        asset: "SOL", entry: sol.entryPrice, current: mid, pnlPct: pnlPct.toFixed(3) + '%'
      }, null, 2));
      
      // 2. Close position (SOL is LONG, so isBuy=false to close)
      const res = await closePosition("SOL", sol.size, false);
      console.log('CLOSE_RESULT:' + JSON.stringify(res));
      
      // 3. Cancel open orders
      const orders = await getOpenOrders();
      const solOrders = orders.filter(o => o.coin === 'SOL');
      for (const o of solOrders) {
        await cancelOrder('SOL', o.oid);
        console.log('CANCELED_ORDER:' + o.oid);
      }
      
      // 4. Update DB
      const trade = db.prepare("SELECT id FROM trades WHERE market = 'SOL' AND status = 'open'").get();
      if (trade) {
        db.prepare("UPDATE trades SET status = 'closed', close_price = ?, close_time = ?, close_reason = 'manual_tp_reached', pnl_pct = ?, pnl_usdc = ? WHERE id = ?")
          .run(mid, new Date().toISOString(), pnlPct, pnlPct / 100 * sol.marginUsed * 10, trade.id);
        console.log("DB_UPDATED: " + trade.id);
      }
      
      db.close();
    }
    closeSol().catch(e => { console.error(e); process.exit(1); });
  `;
  
  await ssh.execCommand(`cat > /tmp/close_sol_manual.mjs << 'EOF'
${remoteScript}
EOF`);

  const res = await ssh.execCommand('node /tmp/close_sol_manual.mjs');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

run().catch(console.error);
