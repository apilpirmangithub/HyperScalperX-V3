import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: 'server021294638',
    username: 'root',
    password: '@venged7XXgg32'
  });

  const remoteScript = `
    import { initHyperliquid, getOpenPositions, closePosition, getOpenOrders, cancelOrder, getMidPrice } from '/root/automaton/dist/survival/hyperliquid.js';
    import Database from '/root/automaton/node_modules/better-sqlite3/lib/index.js';
    const db = new Database('/root/.automaton/state.db');
    
    async function main() {
      await initHyperliquid();
      const pos = await getOpenPositions();
      const sol = pos.find(p => p.asset === "SOL");
      
      if (sol) {
        console.log("CLOSING_SOL_NOW");
        const mid = await getMidPrice("SOL");
        const pnlPct = ((mid - sol.entryPrice) / sol.entryPrice * 100);
        
        await closePosition("SOL", sol.size, false);
        
        // Update DB
        const trade = db.prepare("SELECT id FROM trades WHERE market = 'SOL' AND status = 'open'").get();
        if (trade) {
          db.prepare("UPDATE trades SET status = 'closed', close_price = ?, close_time = ?, close_reason = 'manual_tp_reached', pnl_pct = ?, pnl_usdc = ? WHERE id = ?")
            .run(mid, new Date().toISOString(), pnlPct, pnlPct / 100 * sol.marginUsed * 10, trade.id);
          console.log("DB_UPDATED: " + trade.id);
        }
        
        // Cancel orders
        const orders = await getOpenOrders();
        const solOrders = orders.filter(o => o.coin === 'SOL');
        for (const o of solOrders) {
          await cancelOrder('SOL', o.oid);
          console.log('CANCELED_ORDER:' + o.oid);
        }
      } else {
        console.log("SOL_NOT_FOUND");
      }
      db.close();
    }
    main().catch(console.error);
  `;
  
  await ssh.execCommand(`cat > /tmp/final_close_sol.mjs << 'EOF'
${remoteScript}
EOF`);

  const res = await ssh.execCommand('node /tmp/final_close_sol.mjs');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

run().catch(console.error);
