const fs = require("fs");
const path = require("path");
const pool = require("../db/client");
const crypto = require("crypto");

const DOCUMENTS_DB_PATH = path.join(__dirname, "../db/documents.json");
const VERSIONS_DB_PATH = path.join(__dirname, "../db/versions.json");

// Helper to read JSON databases
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

// Helper to write JSON databases
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

// Save a document version snapshot helper
const createVersion = async (document_id, version_number, data) => {
  if (isUsingPg()) {
    await pool.query(
      `
      insert into document_versions (document_id, version_number, data)
      values ($1, $2, $3)
      `,
      [document_id, version_number, data]
    );
  } else {
    const versions = readJsonDb(VERSIONS_DB_PATH);
    const newVersion = {
      id: crypto.randomUUID(),
      document_id,
      version_number,
      data,
      created_at: new Date().toISOString(),
    };
    versions.push(newVersion);
    writeJsonDb(VERSIONS_DB_PATH, versions);
  }
};

exports.create = async ({ id, name, data, user_id }) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      insert into documents (id, name, data, user_id)
      values ($1, $2, $3, $4)
      returning *
      `,
      [id, name, data, user_id]
    );
    // Also save the initial version snapshot
    await createVersion(id, 1, data);
    return result.rows[0];
  } else {
    const docs = readJsonDb(DOCUMENTS_DB_PATH);
    const newDoc = {
      id,
      name,
      data,
      user_id,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    docs.push(newDoc);
    writeJsonDb(DOCUMENTS_DB_PATH, docs);

    // Save initial version snapshot
    await createVersion(id, 1, data);
    return newDoc;
  }
};

exports.list = async (user_id) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      select id, name, version, created_at, updated_at
      from documents
      where user_id = $1
      order by updated_at desc
      `,
      [user_id]
    );
    return result.rows;
  } else {
    const docs = readJsonDb(DOCUMENTS_DB_PATH);
    return docs
      .filter((doc) => doc.user_id === user_id)
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

exports.getById = async (id, user_id) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      select *
      from documents
      where id = $1 and user_id = $2
      `,
      [id, user_id]
    );
    return result.rows[0] || null;
  } else {
    const docs = readJsonDb(DOCUMENTS_DB_PATH);
    return docs.find((doc) => doc.id === id && doc.user_id === user_id) || null;
  }
};

exports.update = async (id, user_id, { name, data, version, manual }) => {
  // 1. Get current document to check version conflict
  const currentDoc = await exports.getById(id, user_id);
  if (!currentDoc) return null;

  // Optimistic Concurrency check
  if (version !== undefined && currentDoc.version !== version) {
    return { conflict: true, currentVersion: currentDoc.version };
  }

  const nextVersion = currentDoc.version + 1;

  if (isUsingPg()) {
    const result = await pool.query(
      `
      update documents
      set
        name = coalesce($3, name),
        data = coalesce($4, data),
        version = $5,
        updated_at = now()
      where id = $1 and user_id = $2
      returning *
      `,
      [id, user_id, name ?? null, data ?? null, nextVersion]
    );
    
    const updatedDoc = result.rows[0];
    if (updatedDoc) {
      // Save version history snapshot on manual save or every 5th version
      if (manual || nextVersion % 5 === 0) {
        await createVersion(id, nextVersion, updatedDoc.data);
      }
    }
    return updatedDoc || null;
  } else {
    const docs = readJsonDb(DOCUMENTS_DB_PATH);
    const docIndex = docs.findIndex((doc) => doc.id === id && doc.user_id === user_id);
    if (docIndex === -1) return null;

    const doc = docs[docIndex];
    if (name !== undefined) doc.name = name;
    if (data !== undefined) doc.data = data;
    doc.version = nextVersion;
    doc.updated_at = new Date().toISOString();

    docs[docIndex] = doc;
    writeJsonDb(DOCUMENTS_DB_PATH, docs);

    // Save version history snapshot on manual save or every 5th version
    if (manual || nextVersion % 5 === 0) {
      await createVersion(id, nextVersion, doc.data);
    }
    return doc;
  }
};

exports.remove = async (id, user_id) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      delete from documents
      where id = $1 and user_id = $2
      returning id
      `,
      [id, user_id]
    );
    return result.rowCount > 0;
  } else {
    const docs = readJsonDb(DOCUMENTS_DB_PATH);
    const initialLength = docs.length;
    const filteredDocs = docs.filter((doc) => !(doc.id === id && doc.user_id === user_id));
    if (filteredDocs.length === initialLength) return false;

    writeJsonDb(DOCUMENTS_DB_PATH, filteredDocs);
    
    // Also delete version snapshots associated with the document
    const versions = readJsonDb(VERSIONS_DB_PATH);
    const filteredVersions = versions.filter((v) => v.document_id !== id);
    writeJsonDb(VERSIONS_DB_PATH, filteredVersions);
    return true;
  }
};

exports.listVersions = async (document_id, user_id) => {
  const doc = await exports.getById(document_id, user_id);
  if (!doc) return null;

  if (isUsingPg()) {
    const result = await pool.query(
      `
      select id, document_id, version_number, created_at
      from document_versions
      where document_id = $1
      order by version_number desc
      `,
      [document_id]
    );
    return result.rows;
  } else {
    const versions = readJsonDb(VERSIONS_DB_PATH);
    return versions
      .filter((v) => v.document_id === document_id)
      .map((v) => ({
        id: v.id,
        document_id: v.document_id,
        version_number: v.version_number,
        created_at: v.created_at,
      }))
      .sort((a, b) => b.version_number - a.version_number);
  }
};

exports.getVersionById = async (document_id, version_id, user_id) => {
  const doc = await exports.getById(document_id, user_id);
  if (!doc) return null;

  if (isUsingPg()) {
    const result = await pool.query(
      `
      select *
      from document_versions
      where id = $1 and document_id = $2
      `,
      [version_id, document_id]
    );
    return result.rows[0] || null;
  } else {
    const versions = readJsonDb(VERSIONS_DB_PATH);
    return versions.find((v) => v.id === version_id && v.document_id === document_id) || null;
  }
};

exports.restore = async (document_id, version_id, user_id) => {
  const doc = await exports.getById(document_id, user_id);
  if (!doc) return null;

  const version = await exports.getVersionById(document_id, version_id, user_id);
  if (!version) return null;

  // Restore the data column by updating the document version increment
  const updatedDoc = await exports.update(document_id, user_id, {
    name: doc.name,
    data: version.data,
    version: doc.version,
    manual: true, // force a version entry upon restoration
  });

  return updatedDoc;
};
