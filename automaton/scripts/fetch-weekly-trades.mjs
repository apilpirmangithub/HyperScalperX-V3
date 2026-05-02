import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function checkWeeklyTrades() {
  try {
    await ssh.connect({
      host: 'server021294638',
      username: 'root',
      password: '@venged7XXgg32'
    });

    const script = `
      import Database from 'better-sqlite3';
      try {
          const db = new Database('/root/.automaton/state.db');
          const oneWeekAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const trades = db.prepare('SELECT * FROM trades WHERE open_time > ? ORDER BY open_time DESC').all(oneWeekAgo);

          let totalPnl = 0;
          let wins = 0;
          let losses = 0;
          let active = 0;

          trades.forEach(t => {
              if (t.status === 'open') {
                  active++;
              } else {
                  totalPnl += t.pnl_usdc || 0;
                  if (t.pnl_usdc > 0) wins++;
                  else if (t.pnl_usdc < 0) losses++;
              }
          });

          const closedCount = wins + losses;

          console.log('--- WEEKLY TRADES SUMMARY (Last 7 Days) ---');
          console.log(\`Total Opened Trades : \${trades.length}\`);
          console.log(\`Currently Active    : \${active}\`);
          console.log(\`Closed Trades       : \${closedCount}\`);
          console.log(\`Wins: \${wins} | Losses: \${losses}\`);
          console.log(\`Winrate (Closed)    : \${closedCount > 0 ? ((wins/closedCount)*100).toFixed(2) : 0}%\`);
          console.log(\`Net Target PnL      : $\${totalPnl.toFixed(2)}\`);

          if (trades.length > 0) {
              console.log('\\n--- LAST 10 TRADES LOG ---');
              trades.slice(0, 10).forEach(t => {
                  const state = t.status === 'open' ? '🟢 OPEN' : '🔴 CLOSED';
                  const pnl = t.status === 'open' ? '---' : \`$\${(t.pnl_usdc||0).toFixed(2)} (\${(t.pnl_pct||0).toFixed(2)}%)\`;
                  console.log(\`[\${t.open_time.split('.')[0]}] \${state} | \${t.side} \${t.market} | PnL: \${pnl} | Reason: \${t.close_reason || '-'}\`);
              });
          }
      } catch (err) {
          console.error("DB Error:", err.message);
      }
    `;

    await ssh.execCommand(`cat > weekly_trades.mjs << 'EOF'
${script}
EOF`, { cwd: '/root/HyperScalperX/automaton' });

    const result = await ssh.execCommand('node weekly_trades.mjs', { cwd: '/root/HyperScalperX/automaton' });
    console.log(result.stdout || result.stderr);
    ssh.dispose();
  } catch (err) {
    console.error("SSH Error:", err);
  }
}

checkWeeklyTrades();
