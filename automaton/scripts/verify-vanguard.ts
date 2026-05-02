/**
 * Sultan Agung Verification Script
 * Checks the database for the latest activity to confirm deployment.
 */
import Database from 'better-sqlite3';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'state.db');
const db = new Database(dbPath);

console.log("═══════════════════════════════════════════════════");
console.log("🛡️ SULTAN AGUNG DEPLOYMENT VERIFICATION");
console.log("═══════════════════════════════════════════════════");

try {
    const activities = db.prepare('SELECT * FROM activity ORDER BY timestamp DESC LIMIT 5').all();
    console.log("\n📈 Latest Activities:");
    activities.forEach((a: any) => {
        console.log(`[${a.timestamp}] ${a.type}: ${a.messageEn}`);
    });

    const trades = db.prepare('SELECT * FROM trade ORDER BY open_time DESC LIMIT 1').all();
    if (trades.length > 0) {
        console.log("\n🎯 Last Signal/Trade:");
        const t = trades[0];
        console.log(`Asset: ${t.market} | Side: ${t.side} | TP: ${t.dynamic_tp}% | SL: ${t.dynamic_sl}%`);
    } else {
        console.log("\n⌛ No trades found yet (Waiting for 1H signal).");
    }
} catch (e: any) {
    console.log(`❌ Error reading DB: ${e.message}`);
}
db.close();
