import fs from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const logPath = join(homedir(), '.automaton', 'logs', 'agent.log');

if (!fs.existsSync(logPath)) {
    console.error('Log file not found');
    process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

console.log('--- TRADE SUMMARY ---');
let trades = [];
let currentTrade = null;

for (const line of lines) {
    // Basic heuristics for trade lines
    if (line.includes('[TRADE] OPENED')) {
        const match = line.match(/([A-Z]+) at \$([0-9.]+)/);
        if (match) {
            trades.push({
                market: match[1],
                entryPrice: match[2],
                time: line.substring(1, 25),
                status: 'OPEN'
            });
        }
    }
    if (line.includes('[TRADE] CLOSED')) {
        const match = line.match(/([A-Z]+) .* PNL: \$?([0-9.-]+)/);
        if (match) {
            const lastId = trades.length - 1;
            if (lastId >= 0 && trades[lastId].status === 'OPEN' && trades[lastId].market === match[1]) {
                trades[lastId].status = 'CLOSED';
                trades[lastId].pnl = match[2];
            } else {
                trades.push({
                    market: match[1],
                    pnl: match[2],
                    status: 'CLOSED_ORPHAN',
                    time: line.substring(1, 25)
                });
            }
        }
    }
}

console.log(`Total trades found: ${trades.length}`);
trades.reverse().slice(0, 10).forEach(t => {
    console.log(`${t.time} | ${t.market} | ${t.status} | PNL: ${t.pnl || 'N/A'}`);
});
