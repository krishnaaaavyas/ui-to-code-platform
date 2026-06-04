const fs = require("fs");
const path = require("path");
const pool = require("../db/client");
const crypto = require("crypto");
const authService = require("./auth.service");

const PERMISSIONS_DB_PATH = path.join(__dirname, "../db/permissions.json");

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
  return pool !== null && process.env.DATABASE_URL !== undefined;
};

exports.create = async ({ documentId, userId, role }) => {
  const id = crypto.randomUUID();
  if (isUsingPg()) {
    const result = await pool.query(
      `
      insert into document_permissions (id, document_id, user_id, role)
      values ($1, $2, $3, $4)
      on conflict (document_id, user_id)
      do update set role = excluded.role
      returning *
      `,
      [id, documentId, userId, role]
    );
    return result.rows[0];
  } else {
    const permissions = readJsonDb(PERMISSIONS_DB_PATH);
    const existingIndex = permissions.findIndex(
      (p) => p.document_id === documentId && p.user_id === userId
    );

    const newPermission = {
      id: existingIndex >= 0 ? permissions[existingIndex].id : id,
      document_id: documentId,
      user_id: userId,
      role,
      created_at: existingIndex >= 0 ? permissions[existingIndex].created_at : new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      permissions[existingIndex] = newPermission;
    } else {
      permissions.push(newPermission);
    }
    writeJsonDb(PERMISSIONS_DB_PATH, permissions);
    return newPermission;
  }
};

exports.list = async (documentId) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      select p.id, p.document_id, p.user_id, p.role, p.created_at, u.email
      from document_permissions p
      join users u on p.user_id = u.id
      where p.document_id = $1
      order by p.created_at asc
      `,
      [documentId]
    );
    return result.rows;
  } else {
    const permissions = readJsonDb(PERMISSIONS_DB_PATH);
    const docPermissions = permissions.filter((p) => p.document_id === documentId);
    
    // Resolve email manually from users list
    const list = [];
    for (const p of docPermissions) {
      const user = await authService.getById(p.user_id);
      list.push({
        id: p.id,
        document_id: p.document_id,
        user_id: p.user_id,
        role: p.role,
        created_at: p.created_at,
        email: user ? user.email : "unknown@example.com",
      });
    }
    return list;
  }
};

exports.remove = async (permissionId) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      delete from document_permissions
      where id = $1
      returning id
      `,
      [permissionId]
    );
    return result.rowCount > 0;
  } else {
    const permissions = readJsonDb(PERMISSIONS_DB_PATH);
    const filtered = permissions.filter((p) => p.id !== permissionId);
    if (filtered.length === permissions.length) return false;
    writeJsonDb(PERMISSIONS_DB_PATH, filtered);
    return true;
  }
};

exports.getByUserAndDoc = async (userId, documentId) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      select *
      from document_permissions
      where user_id = $1 and document_id = $2
      `,
      [userId, documentId]
    );
    return result.rows[0] || null;
  } else {
    const permissions = readJsonDb(PERMISSIONS_DB_PATH);
    return permissions.find((p) => p.user_id === userId && p.document_id === documentId) || null;
  }
};
