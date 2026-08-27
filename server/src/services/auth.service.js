const pool = require("../db/client");
const crypto = require("crypto");

exports.create = async ({ email, passwordHash }) => {
  const id = crypto.randomUUID();
  const result = await pool.query(
    `
    insert into users (id, email, password_hash)
    values ($1, $2, $3)
    returning id, email, created_at
    `,
    [id, email, passwordHash]
  );
  return result.rows[0];
};

exports.getByEmail = async (email) => {
  const result = await pool.query(
    `
    select *
    from users
    where lower(email) = lower($1)
    `,
    [email]
  );
  return result.rows[0] || null;
};

exports.getById = async (id) => {
  const result = await pool.query(
    `
    select id, email, created_at
    from users
    where id = $1
    `,
    [id]
  );
  return result.rows[0] || null;
};

// Refresh token tracking
exports.saveRefreshToken = async (userId, token, expiresAt) => {
  const id = crypto.randomUUID();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const result = await pool.query(
    `
    insert into refresh_tokens (id, user_id, token, expires_at)
    values ($1, $2, $3, $4)
    returning *
    `,
    [id, userId, tokenHash, expiresAt.toISOString()]
  );
  return result.rows[0];
};

exports.createRefreshToken = exports.saveRefreshToken;

exports.getRefreshToken = async (token) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const result = await pool.query(
    `
    select *
    from refresh_tokens
    where token = $1
    `,
    [tokenHash]
  );
  return result.rows[0] || null;
};

exports.deleteRefreshToken = async (token) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const result = await pool.query(
    `
    delete from refresh_tokens
    where token = $1
    returning id
    `,
    [tokenHash]
  );
  return result.rowCount > 0;
};

exports.revokeRefreshToken = exports.deleteRefreshToken;

exports.revokeAllUserRefreshTokens = async (userId) => {
  await pool.query(
    `
    delete from refresh_tokens
    where user_id = $1
    `,
    [userId]
  );
};
