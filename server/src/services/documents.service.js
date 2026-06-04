const fs = require("fs");
const path = require("path");
const pool = require("../db/client");

const JSON_DB_PATH = path.join(__dirname, "../db/documents.json");

// Helper to read JSON file database
const readJsonDb = () => {
  try {
    if (!fs.existsSync(JSON_DB_PATH)) {
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify([]));
    }
    const data = fs.readFileSync(JSON_DB_PATH, "utf8");
    return JSON.parse(data || "[]");
  } catch (error) {
    console.error("Error reading JSON database:", error);
    return [];
  }
};

// Helper to write JSON file database
const writeJsonDb = (data) => {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing JSON database:", error);
  }
};

// Check if using PostgreSQL database
const isUsingPg = () => {
  return pool !== null && process.env.DATABASE_URL !== undefined;
};

exports.create = async ({ id, name, data }) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      insert into documents (id, name, data)
      values ($1, $2, $3)
      returning *
      `,
      [id, name, data]
    );
    return result.rows[0];
  } else {
    const docs = readJsonDb();
    const newDoc = {
      id,
      name,
      data,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    docs.push(newDoc);
    writeJsonDb(docs);
    return newDoc;
  }
};

exports.list = async () => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      select id, name, version, created_at, updated_at
      from documents
      order by updated_at desc
      `
    );
    return result.rows;
  } else {
    const docs = readJsonDb();
    return docs
      .map((doc) => ({
        id: doc.id,
        name: doc.name,
        version: doc.version,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      }))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
};

exports.getById = async (id) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      select *
      from documents
      where id = $1
      `,
      [id]
    );
    return result.rows[0] || null;
  } else {
    const docs = readJsonDb();
    return docs.find((doc) => doc.id === id) || null;
  }
};

exports.update = async (id, { name, data }) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      update documents
      set
        name = coalesce($2, name),
        data = coalesce($3, data),
        version = version + 1,
        updated_at = now()
      where id = $1
      returning *
      `,
      [id, name ?? null, data ?? null]
    );
    return result.rows[0] || null;
  } else {
    const docs = readJsonDb();
    const docIndex = docs.findIndex((doc) => doc.id === id);
    if (docIndex === -1) return null;

    const doc = docs[docIndex];
    if (name !== undefined) doc.name = name;
    if (data !== undefined) doc.data = data;
    doc.version += 1;
    doc.updated_at = new Date().toISOString();

    docs[docIndex] = doc;
    writeJsonDb(docs);
    return doc;
  }
};

exports.remove = async (id) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      delete from documents
      where id = $1
      returning id
      `,
      [id]
    );
    return result.rowCount > 0;
  } else {
    const docs = readJsonDb();
    const initialLength = docs.length;
    const filteredDocs = docs.filter((doc) => doc.id !== id);
    if (filteredDocs.length === initialLength) return false;

    writeJsonDb(filteredDocs);
    return true;
  }
};
