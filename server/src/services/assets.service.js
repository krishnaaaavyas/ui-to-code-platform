const pool = require("../db/client");
const crypto = require("crypto");

exports.create = async ({ documentId, userId, key, url, mimeType, sizeBytes }) => {
  const id = crypto.randomUUID();
  const result = await pool.query(
    `
    insert into assets (id, document_id, user_id, key, url, mime_type, size_bytes)
    values ($1, $2, $3, $4, $5, $6, $7)
    returning *
    `,
    [id, documentId, userId, key, url, mimeType || null, sizeBytes || null]
  );
  return result.rows[0];
};

exports.list = async (documentId) => {
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
};

exports.deleteOrphanedAssets = async (activeKeys) => {
  // Utility to delete assets from DB not in activeKeys list
  if (!activeKeys || activeKeys.length === 0) return;
  const placeholders = activeKeys.map((_, i) => `$${i + 1}`).join(", ");
  await pool.query(
    `
    delete from assets
    where key not in (${placeholders})
    `,
    activeKeys
  );
};
