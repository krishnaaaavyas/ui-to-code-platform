const pool = require("../db/client");
const crypto = require("crypto");

// Custom Error helpers
class DocumentError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

const createVersion = async (tx, document_id, version_number, data) => {
  const id = crypto.randomUUID();
  await tx.query(
    `
    insert into document_versions (id, document_id, version_number, data)
    values ($1, $2, $3, $4)
    `,
    [id, document_id, version_number, data]
  );
};

exports.create = async ({ id, name, data, user_id }) => {
  const result = await pool.runTransaction(async (tx) => {
    const docResult = await tx.query(
      `
      insert into documents (id, name, data, user_id)
      values ($1, $2, $3, $4)
      returning *
      `,
      [id, name, data, user_id]
    );
    await createVersion(tx, id, 1, data);
    return docResult.rows[0];
  });
  return result;
};

exports.list = async (user_id) => {
  const result = await pool.query(
    `
    select d.id, d.name, d.version, d.created_at, d.updated_at, d.user_id,
           case when d.user_id = $1 then 'owner' else p.role end as user_role
    from documents d
    left join document_permissions p on p.document_id = d.id and p.user_id = $1
    where d.user_id = $1 or p.id is not null
    order by d.updated_at desc
    `,
    [user_id]
  );
  return result.rows;
};

exports.getById = async (id, user_id) => {
  const result = await pool.query(
    `
    select d.*,
           case when d.user_id = $2 then 'owner' else p.role end as user_role
    from documents d
    left join document_permissions p on p.document_id = d.id and p.user_id = $2
    where d.id = $1 and (d.user_id = $2 or p.id is not null)
    `,
    [id, user_id]
  );
  return result.rows[0] || null;
};

exports.update = async (id, callerUserId, { name, data, version, manual }) => {
  return await pool.runTransaction(async (tx) => {
    // 1. Get current document and permission
    const selectRes = await tx.query(
      `
      select d.id, d.name, d.version, d.user_id as owner_id, p.role
      from documents d
      left join document_permissions p on p.document_id = d.id and p.user_id = $2
      where d.id = $1
      `,
      [id, callerUserId]
    );

    const doc = selectRes.rows[0];
    if (!doc) {
      throw new DocumentError(404, "document not found");
    }

    const userRole = doc.owner_id === callerUserId ? "owner" : (doc.role || null);
    if (!userRole) {
      throw new DocumentError(404, "document not found");
    }

    if (userRole === "viewer") {
      throw new DocumentError(403, "Access denied: Viewers cannot modify this design.");
    }

    // 2. Optimistic Concurrency check
    if (version !== undefined && doc.version !== version) {
      throw new DocumentError(409, "Version conflict: This design has been updated elsewhere. Please reload or duplicate.", {
        currentVersion: doc.version,
      });
    }

    const nextVersion = doc.version + 1;

    // 3. Perform update
    const updateRes = await tx.query(
      `
      update documents
      set
        name = coalesce($2, name),
        data = coalesce($3, data),
        version = $4,
        updated_at = now()
      where id = $1
      returning *
      `,
      [id, name ?? null, data ?? null, nextVersion]
    );

    const updatedDoc = updateRes.rows[0];
    if (!updatedDoc) {
      throw new DocumentError(404, "document not found");
    }

    // 4. Save version history snapshot
    if (manual || nextVersion % 5 === 0) {
      await createVersion(tx, id, nextVersion, updatedDoc.data);
    }

    return updatedDoc;
  });
};

exports.remove = async (id, callerUserId) => {
  return await pool.runTransaction(async (tx) => {
    const selectRes = await tx.query(
      `
      select user_id from documents where id = $1
      `,
      [id]
    );
    const doc = selectRes.rows[0];
    if (!doc) {
      throw new DocumentError(404, "document not found");
    }

    if (doc.user_id !== callerUserId) {
      throw new DocumentError(403, "Access denied: Only owners can delete this design.");
    }

    const deleteRes = await tx.query(
      `
      delete from documents
      where id = $1
      returning id
      `,
      [id]
    );

    return deleteRes.rowCount > 0;
  });
};

exports.listVersions = async (document_id, user_id) => {
  const doc = await exports.getById(document_id, user_id);
  if (!doc) {
    throw new DocumentError(404, "document not found");
  }

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
};

exports.getVersionById = async (document_id, version_id, user_id) => {
  const doc = await exports.getById(document_id, user_id);
  if (!doc) {
    throw new DocumentError(404, "document not found");
  }

  const result = await pool.query(
    `
    select *
    from document_versions
    where id = $1 and document_id = $2
    `,
    [version_id, document_id]
  );
  return result.rows[0] || null;
};

exports.restore = async (document_id, version_id, user_id) => {
  return await pool.runTransaction(async (tx) => {
    // 1. Get document and verify role
    const selectRes = await tx.query(
      `
      select d.id, d.name, d.version, d.user_id as owner_id, p.role
      from documents d
      left join document_permissions p on p.document_id = d.id and p.user_id = $2
      where d.id = $1
      `,
      [document_id, user_id]
    );

    const doc = selectRes.rows[0];
    if (!doc) {
      throw new DocumentError(404, "document not found");
    }

    const userRole = doc.owner_id === user_id ? "owner" : (doc.role || null);
    if (!userRole) {
      throw new DocumentError(404, "document not found");
    }

    if (userRole === "viewer") {
      throw new DocumentError(403, "Access denied: Viewers cannot restore versions.");
    }

    // 2. Fetch version data
    const versionRes = await tx.query(
      `
      select data from document_versions
      where id = $1 and document_id = $2
      `,
      [version_id, document_id]
    );
    const version = versionRes.rows[0];
    if (!version) {
      throw new DocumentError(404, "version not found");
    }

    const nextVersion = doc.version + 1;

    // 3. Update document with version data
    const updateRes = await tx.query(
      `
      update documents
      set data = $2, version = $3, updated_at = now()
      where id = $1
      returning *
      `,
      [document_id, version.data, nextVersion]
    );

    const updatedDoc = updateRes.rows[0];
    await createVersion(tx, document_id, nextVersion, updatedDoc.data);

    return updatedDoc;
  });
};

exports.DocumentError = DocumentError;
