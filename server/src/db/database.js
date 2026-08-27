const { Pool } = require("pg");
const Database = require("better-sqlite3");
const path = require("path");

let pool = null;
let sqliteDb = null;
let usePg = false;

// Determine DB type
if (process.env.DATABASE_URL) {
  usePg = true;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
} else {
  // Use SQLite fallback
  const dbPath = process.env.NODE_ENV === "test"
    ? ":memory:"
    : path.join(__dirname, "sqlite.db");
  
  sqliteDb = new Database(dbPath);
  
  // Enable foreign keys
  sqliteDb.pragma("foreign_keys = ON");
  
  // Initialize SQLite tables
  initSqliteSchema();
}

function initSqliteSchema() {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_permissions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (document_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
    CREATE INDEX IF NOT EXISTS idx_document_permissions_document_id ON document_permissions(document_id);
    CREATE INDEX IF NOT EXISTS idx_assets_document_id ON assets(document_id);
  `);
}

// Convert PG parameter placeholders ($1, $2) to SQLite (?)
function mapQuery(pgSql, params = []) {
  const placeholders = [];
  const regex = /\$(\d+)/g;
  let match;
  while ((match = regex.exec(pgSql)) !== null) {
    placeholders.push(parseInt(match[1], 10));
  }
  
  const sqliteSql = pgSql.replace(/now\(\)/gi, "datetime('now')").replace(/\$\d+/g, "?");
  const sqliteParams = placeholders.map((idx) => {
    const val = params[idx - 1];
    if (val !== null && typeof val === "object") {
      return JSON.stringify(val);
    }
    return val;
  });
  
  return { sql: sqliteSql, params: sqliteParams };
}

// Post-process rows to parse JSON strings back to objects
function postProcess(rows) {
  if (!rows) return rows;
  const isArray = Array.isArray(rows);
  const list = isArray ? rows : [rows];
  
  for (const row of list) {
    if (row && typeof row.data === "string") {
      try {
        row.data = JSON.parse(row.data);
      } catch (e) {
        // Already parsed or invalid
      }
    }
  }
  return isArray ? list : list[0];
}

// Explicitly maps columns to values for RETURNING emulation in SQLite
function getInsertedRow(sql, params, lastInsertRowid) {
  const insertMatch = sql.match(/insert\s+into\s+\w+\s*\(([^)]+)\)/i);
  if (insertMatch) {
    const cols = insertMatch[1].split(",").map(c => c.trim());
    const row = {};
    cols.forEach((col, idx) => {
      row[col] = params[idx];
    });
    if (!row.id) {
      row.id = lastInsertRowid;
    }
    return row;
  }
  
  const updateMatch = sql.match(/update\s+\w+\s+set\s+([\s\S]+?)(?:\s+where|$)/i);
  if (updateMatch) {
    const setClause = updateMatch[1];
    const row = {};
    const parts = setClause.split(",");
    parts.forEach((part) => {
      const eqIdx = part.indexOf("=");
      if (eqIdx !== -1) {
        const col = part.substring(0, eqIdx).trim();
        const valPlaceholder = part.substring(eqIdx + 1).trim();
        const paramIdxMatch = valPlaceholder.match(/\$(\d+)/);
        if (paramIdxMatch) {
          const paramIdx = parseInt(paramIdxMatch[1], 10) - 1;
          row[col] = params[paramIdx];
        }
      }
    });
    const whereMatch = sql.match(/where\s+id\s*=\s*\$(\d+)/i);
    if (whereMatch) {
      const paramIdx = parseInt(whereMatch[1], 10) - 1;
      row.id = params[paramIdx];
    }
    return row;
  }

  return {};
}

// Unified Query interface
async function query(sql, params = []) {
  if (usePg) {
    try {
      const res = await pool.query(sql, params);
      return { rows: res.rows, rowCount: res.rowCount };
    } catch (err) {
      console.error("Postgres Query Error:", err, "SQL:", sql);
      throw err;
    }
  } else {
    try {
      const { sql: sqliteSql, params: sqliteParams } = mapQuery(sql, params);
      const isSelect = sqliteSql.trim().toLowerCase().startsWith("select");
      
      if (isSelect) {
        const rows = sqliteDb.prepare(sqliteSql).all(sqliteParams);
        return { rows: postProcess(rows), rowCount: rows.length };
      } else {
        const info = sqliteDb.prepare(sqliteSql).run(sqliteParams);
        
        if (sql.toLowerCase().includes("returning")) {
          const row = { id: info.lastInsertRowid, ...params };
          const parsed = getInsertedRow(sql, params, info.lastInsertRowid);
          Object.assign(row, parsed);
          return { rows: postProcess([row]), rowCount: 1 };
        }
        return { rows: [], rowCount: info.changes };
      }
    } catch (err) {
      console.error("SQLite Query Error:", err, "SQL:", sql);
      throw err;
    }
  }
}

// Unified Transaction interface
async function runTransaction(callback) {
  if (usePg) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const transClient = {
        query: async (sql, params = []) => {
          const res = await client.query(sql, params);
          return { rows: res.rows, rowCount: res.rowCount };
        },
      };
      const result = await callback(transClient);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } else {
    sqliteDb.prepare("BEGIN").run();
    try {
      const transClient = {
        query: async (sql, params = []) => {
          const { sql: sqliteSql, params: sqliteParams } = mapQuery(sql, params);
          const isSelect = sqliteSql.trim().toLowerCase().startsWith("select");
          if (isSelect) {
            const rows = sqliteDb.prepare(sqliteSql).all(sqliteParams);
            return { rows: postProcess(rows), rowCount: rows.length };
          } else {
            const info = sqliteDb.prepare(sqliteSql).run(sqliteParams);
            if (sql.toLowerCase().includes("returning")) {
              const row = { id: info.lastInsertRowid, ...params };
              const parsed = getInsertedRow(sql, params, info.lastInsertRowid);
              Object.assign(row, parsed);
              return { rows: postProcess([row]), rowCount: 1 };
            }
            return { rows: [], rowCount: info.changes };
          }
        },
      };
      const result = await callback(transClient);
      sqliteDb.prepare("COMMIT").run();
      return result;
    } catch (err) {
      sqliteDb.prepare("ROLLBACK").run();
      throw err;
    }
  }
}

module.exports = {
  query,
  runTransaction,
  isPg: () => usePg,
  pool,
  sqliteDb,
};
