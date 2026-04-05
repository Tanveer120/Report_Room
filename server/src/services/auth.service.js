const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const oracledb = require('oracledb');
const { getPool } = require('../config/connection-manager');
const { loadEnvironment } = require('../config/environment');
const ApiError = require('../utils/api-error');

const SALT_ROUNDS = 10;
const env = loadEnvironment();

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

function generateTokens(user) {
  const payload = {
    id: user.id,
    username: user.username,
    roles: user.roles || [],
  };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired access token');
  }
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
}

async function findUserByUsername(username) {
  const pool = getPool();
  const result = await pool.execute(
    `SELECT u.id, u.username, u.email, u.password_hash, u.is_active, u.created_at, u.updated_at,
            r.id AS role_id, r.name AS role_name
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE u.username = :username
     ORDER BY r.name ASC`,
    { username },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (result.rows.length === 0) return null;

  const firstRow = result.rows[0];
  const roles = result.rows
    .filter(r => r.ROLE_ID !== null)
    .map(r => r.ROLE_NAME);

  return {
    id: firstRow.ID,
    username: firstRow.USERNAME,
    email: firstRow.EMAIL,
    password_hash: firstRow.PASSWORD_HASH,
    roles,
    is_active: firstRow.IS_ACTIVE,
    created_at: firstRow.CREATED_AT,
    updated_at: firstRow.UPDATED_AT,
  };
}

async function findUserByEmail(email) {
  const pool = getPool();
  const result = await pool.execute(
    `SELECT u.id, u.username, u.email, u.is_active,
            r.name AS role_name
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE u.email = :email`,
    { email },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (result.rows.length === 0) return null;

  const firstRow = result.rows[0];
  const roles = result.rows
    .filter(r => r.ROLE_NAME !== null)
    .map(r => r.ROLE_NAME);

  return {
    id: firstRow.ID,
    username: firstRow.USERNAME,
    email: firstRow.EMAIL,
    roles,
    is_active: firstRow.IS_ACTIVE,
  };
}

async function findUserById(id) {
  const pool = getPool();
  const result = await pool.execute(
    `SELECT u.id, u.username, u.email, u.is_active, u.created_at, u.updated_at,
            r.id AS role_id, r.name AS role_name, r.is_admin AS role_is_admin, r.is_default AS role_is_default
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE u.id = :id
     ORDER BY r.name ASC`,
    { id },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (result.rows.length === 0) return null;

  const firstRow = result.rows[0];
  const rolesWithMeta = result.rows
    .filter(r => r.ROLE_ID !== null)
    .map(r => ({ name: r.ROLE_NAME, is_admin: r.ROLE_IS_ADMIN }));

  const roles = rolesWithMeta.map(r => r.name);
  const isAdmin = rolesWithMeta.some(r => r.is_admin === 1);

  return {
    id: firstRow.ID,
    username: firstRow.USERNAME,
    email: firstRow.EMAIL,
    roles,
    isAdmin,
    is_active: firstRow.IS_ACTIVE,
    created_at: firstRow.CREATED_AT,
    updated_at: firstRow.UPDATED_AT,
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  findUserByUsername,
  findUserByEmail,
  findUserById,
};
