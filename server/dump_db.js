const Database = require('better-sqlite3');
const db = new Database('src/db/sqlite.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);
for (const table of tables) {
  const count = db.prepare(`SELECT count(*) as c FROM ${table.name}`).get();
  console.log(`Table ${table.name}: ${count.c} rows`);
  if (count.c > 0) {
    const rows = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
    console.log(`Rows in ${table.name}:`, JSON.stringify(rows, null, 2));
  }
}
db.close();
