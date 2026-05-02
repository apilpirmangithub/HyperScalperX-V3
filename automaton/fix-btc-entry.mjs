import Database from 'better-sqlite3';

const db = new Database('/root/.automaton/state.db');
const entryPrice = 76335.0;

console.log(`🔧 Updating BTC entry price to ${entryPrice}...`);

const res = db.prepare("UPDATE trades SET entry_price = ? WHERE market = 'BTC' AND status = 'open'").run(entryPrice);

if (res.changes > 0) {
    console.log("✅ Database updated successfully.");
} else {
    console.log("⚠️ No open BTC trades found in database to update.");
}

db.close();
