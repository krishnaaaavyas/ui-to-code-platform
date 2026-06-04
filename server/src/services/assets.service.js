const fs = require("fs");
const path = require("path");
const pool = require("../db/client");
const crypto = require("crypto");

const ASSETS_DB_PATH = path.join(__dirname, "../db/assets.json");

const readJsonDb = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([]));
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data || "[]");
  } catch (error) {
    console.error(`Error reading JSON database at ${filePath}:`, error);
    return [];
  }
};

const writeJsonDb = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing JSON database at ${filePath}:`, error);
  }
};

const isUsingPg = () => {
  return pool !== null && pool !== undefined && process.env.DATABASE_URL !== undefined;
};

exports.create = async ({ documentId, userId, key, url, mimeType, sizeBytes }) => {
  const id = crypto.randomUUID();
  if (isUsingPg()) {
    const result = await pool.query(
      `
      insert into assets (id, document_id, user_id, key, url, mime_type, size_bytes)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning *
      `,
      [id, documentId, userId, key, url, mimeType || null, sizeBytes || null]
    );
    return result.rows[0];
  } else {
    const assets = readJsonDb(ASSETS_DB_PATH);
    const newAsset = {
      id,
      document_id: documentId,
      user_id: userId,
      key,
      url,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      created_at: new Date().toISOString(),
    };
    assets.push(newAsset);
    writeJsonDb(ASSETS_DB_PATH, assets);
    return newAsset;
  }
};

exports.list = async (documentId) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      select *
      from assets
      where document_id = $1
      order by created_at desc
      `,
      [documentId]
    );
    return result.rows;
  } else {
    const assets = readJsonDb(ASSETS_DB_PATH);
    return assets
      .filter((a) => a.document_id === documentId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
};
