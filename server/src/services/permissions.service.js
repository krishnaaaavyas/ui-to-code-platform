const pool = require("../db/client");
const crypto = require("crypto");

exports.create = async ({ documentId, userId, role }) => {
  const id = crypto.randomUUID();
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
};

exports.list = async (documentId) => {
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
};

exports.remove = async (permissionId) => {
  const result = await pool.query(
    `
    delete from document_permissions
    where id = $1
    returning id
    `,
    [permissionId]
  );
  return result.rowCount > 0;
};

exports.getByUserAndDoc = async (userId, documentId) => {
  const result = await pool.query(
    `
    select *
    from document_permissions
    where user_id = $1 and document_id = $2
    `,
    [userId, documentId]
  );
  return result.rows[0] || null;
};
