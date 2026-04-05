const oracledb = require('oracledb');
const { getPool } = require('../config/connection-manager');
const { hashPassword } = require('./auth.service');
const ApiError = require('../utils/api-error');

async function listUsers({ page = 1, pageSize = 8, search = '' } = {}) {
  const pool = getPool();
  const offset = (page - 1) * pageSize;
  const hasSearch = search && search.trim().length > 0;
  const searchPattern = hasSearch ? `%${search.trim().toLowerCase()}%` : null;

  const countBinds = {};
  const listBinds = { offset, pageSize };

  let searchClause = '';
  if (searchPattern) {
    // If you wanted to search roles properly, it requires a more complex query or subquery.
    // For now, this searches username or email.
    searchClause = `WHERE LOWER(username) LIKE :search OR LOWER(email) LIKE :search`;
    countBinds.search = searchPattern;
    listBinds.search = searchPattern;
  }

  // 1. Get total count
  const countResult = await pool.execute(
    `SELECT COUNT(*) AS total FROM users ${searchClause}`,
    countBinds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const total = countResult.rows[0].TOTAL;

  if (total === 0) {
    return {
      users: [],
      pagination: { page, pageSize, total, totalPages: 0 }
    };
  }

  // 2. Fetch paginated users
  const usersResult = await pool.execute(
    `SELECT id, username, email, is_active, created_at, updated_at
     FROM users
     ${searchClause}
     ORDER BY username ASC
     OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`,
    listBinds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const userIds = usersResult.rows.map(row => row.ID);
  
  // 3. Fetch roles ONLY for the paginated users
  let rolesResult = { rows: [] };
  if (userIds.length > 0) {
    const bindNames = userIds.map((_, i) => `:id${i}`).join(', ');
    const roleBinds = {};
    userIds.forEach((id, i) => { roleBinds[`id${i}`] = id; });

    rolesResult = await pool.execute(
      `SELECT ur.user_id, r.id AS role_id, r.name AS role_name,
              r.is_default AS role_is_default, r.is_admin AS role_is_admin
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id IN (${bindNames})
       ORDER BY ur.user_id, r.name`,
      roleBinds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
  }

  const rolesByUser = {};
  rolesResult.rows.forEach(row => {
    if (!rolesByUser[row.USER_ID]) rolesByUser[row.USER_ID] = [];
    rolesByUser[row.USER_ID].push({
      id: row.ROLE_ID,
      name: row.ROLE_NAME,
      is_default: row.ROLE_IS_DEFAULT,
      is_admin: row.ROLE_IS_ADMIN,
    });
  });

  return {
    users: usersResult.rows.map(row => ({
      id: row.ID,
      username: row.USERNAME,
      email: row.EMAIL,
      is_active: row.IS_ACTIVE,
      created_at: row.CREATED_AT,
      updated_at: row.UPDATED_AT,
      roles: rolesByUser[row.ID] || [],
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    }
  };
}

async function getUserById(id) {
  const pool = getPool();
  const result = await pool.execute(
    `SELECT u.id, u.username, u.email, u.is_active, u.created_at, u.updated_at,
            r.id AS role_id, r.name AS role_name, r.is_default AS role_is_default, r.is_admin AS role_is_admin
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
  const roles = result.rows
    .filter(r => r.ROLE_ID !== null)
    .map(r => ({
      id: r.ROLE_ID,
      name: r.ROLE_NAME,
      is_default: r.ROLE_IS_DEFAULT,
      is_admin: r.ROLE_IS_ADMIN,
    }));

  return {
    id: firstRow.ID,
    username: firstRow.USERNAME,
    email: firstRow.EMAIL,
    is_active: firstRow.IS_ACTIVE,
    created_at: firstRow.CREATED_AT,
    updated_at: firstRow.UPDATED_AT,
    roles,
  };
}

async function createUser({ username, email, password, roleIds = [] }) {
  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();

    const passwordHash = await hashPassword(password);

    const insertResult = await connection.execute(
      `INSERT INTO users (username, email, password_hash, is_active)
       VALUES (:username, :email, :passwordHash, 1)
       RETURNING id, username, email, is_active, created_at, updated_at INTO
         :outId, :outUsername, :outEmail, :outIsActive, :outCreatedAt, :outUpdatedAt`,
      {
        username,
        email,
        passwordHash,
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        outUsername: { type: oracledb.STRING, maxSize: 100, dir: oracledb.BIND_OUT },
        outEmail: { type: oracledb.STRING, maxSize: 255, dir: oracledb.BIND_OUT },
        outIsActive: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        outCreatedAt: { type: oracledb.DATE, dir: oracledb.BIND_OUT },
        outUpdatedAt: { type: oracledb.DATE, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );

    const userId = insertResult.outBinds.outId[0];

    const effectiveRoleIds = roleIds.length > 0 ? roleIds : await _getDefaultRoleId(connection);

    for (const roleId of effectiveRoleIds) {
      await connection.execute(
        `INSERT INTO user_roles (user_id, role_id) VALUES (:userId, :roleId)`,
        { userId, roleId }
      );
    }

    await connection.commit();

    return getUserById(userId);
  } catch (err) {
    if (connection) await connection.rollback();
    if (err.errorNum === 1) {
      throw new ApiError(409, 'A user with this username or email already exists');
    }
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

async function deleteUser(id) {
  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();

    // Soft delete the user by setting is_active = 0
    const result = await connection.execute(
      `UPDATE users SET is_active = 0, updated_at = SYSTIMESTAMP WHERE id = :id AND is_active = 1`,
      { id },
      { autoCommit: false }
    );

    if (result.rowsAffected === 0) {
      throw new ApiError(404, 'User not found or already inactive');
    }

    await connection.commit();
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

async function assignRoles(userId, roleIds) {
  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();

    await connection.execute(
      `DELETE FROM user_roles WHERE user_id = :userId`,
      { userId }
    );

    for (const roleId of roleIds) {
      await connection.execute(
        `INSERT INTO user_roles (user_id, role_id) VALUES (:userId, :roleId)`,
        { userId, roleId }
      );
    }

    await connection.commit();

    return getUserById(userId);
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

async function getUserRoles(userId) {
  const pool = getPool();
  const result = await pool.execute(
    `SELECT r.id, r.name, r.description, r.is_default, r.is_admin, r.is_active
     FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = :userId
     ORDER BY r.name ASC`,
    { userId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows.map(row => ({
    id: row.ID,
    name: row.NAME,
    description: row.DESCRIPTION,
    is_default: row.IS_DEFAULT,
    is_admin: row.IS_ADMIN,
    is_active: row.IS_ACTIVE,
  }));
}

async function removeRole(userId, roleId) {
  const pool = getPool();
  const result = await pool.execute(
    `DELETE FROM user_roles WHERE user_id = :userId AND role_id = :roleId`,
    { userId, roleId },
    { autoCommit: true }
  );

  if (result.rowsAffected === 0) {
    throw new ApiError(404, 'Role not assigned to this user');
  }
}

async function _getDefaultRoleId(connection) {
  const result = await connection.execute(
    `SELECT id FROM roles WHERE is_default = 1 AND is_active = 1`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (result.rows.length === 0) {
    throw new ApiError(400, 'No default role exists. Please create one first.');
  }

  return result.rows.map(r => r.ID);
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  deleteUser,
  assignRoles,
  getUserRoles,
  removeRole,
};
