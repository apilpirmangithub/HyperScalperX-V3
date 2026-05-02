import Database from 'better-sqlite3';

const db = new Database('/root/.automaton/state.db');
const trades = db.prepare("SELECT * FROM trades WHERE status='open'").all();
console.log(JSON.stringify(trades, null, 2));
db.close();
