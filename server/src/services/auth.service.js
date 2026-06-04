const fs = require("fs");
const path = require("path");
const pool = require("../db/client");
const crypto = require("crypto");

const USERS_DB_PATH = path.join(__dirname, "../db/users.json");

const readUsersDb = () => {
  try {
    if (!fs.existsSync(USERS_DB_PATH)) {
      fs.writeFileSync(USERS_DB_PATH, JSON.stringify([]));
    }
    const data = fs.readFileSync(USERS_DB_PATH, "utf8");
    return JSON.parse(data || "[]");
  } catch (error) {
    console.error("Error reading users JSON database:", error);
    return [];
  }
};

const writeUsersDb = (data) => {
  try {
    fs.writeFileSync(USERS_DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing users JSON database:", error);
  }
};

const isUsingPg = () => {
  return pool !== null && process.env.DATABASE_URL !== undefined;
};

exports.create = async ({ email, passwordHash }) => {
  const id = crypto.randomUUID();
  if (isUsingPg()) {
    const result = await pool.query(
      `
      insert into users (id, email, password_hash)
      values ($1, $2, $3)
      returning id, email, created_at
      `,
      [id, email, passwordHash]
    );
    return result.rows[0];
  } else {
    const users = readUsersDb();
    const newUser = {
      id,
      email,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };
    users.push(newUser);
    writeUsersDb(users);
    
    // Return user without password hash
    return {
      id: newUser.id,
      email: newUser.email,
      created_at: newUser.created_at,
    };
  }
};

exports.getByEmail = async (email) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      select *
      from users
      where email = $1
      `,
      [email]
    );
    return result.rows[0] || null;
  } else {
    const users = readUsersDb();
    return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;
  }
};

exports.getById = async (id) => {
  if (isUsingPg()) {
    const result = await pool.query(
      `
      select id, email, created_at
      from users
      where id = $1
      `,
      [id]
    );
    return result.rows[0] || null;
  } else {
    const users = readUsersDb();
    const user = users.find((user) => user.id === id);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    };
  }
};
