const oracledb = require('oracledb');
const { getPool } = require('../config/connection-manager');
const ApiError = require('../utils/api-error');

async function listRoles() {
  const pool = getPool();
  const result = await pool.execute(
    `SELECT r.id, r.name, r.description, r.is_default, r.is_admin, r.is_active, r.created_at,
            (SELECT COUNT(*) FROM user_roles ur WHERE ur.role_id = r.id) AS user_count,
            (SELECT COUNT(*) FROM role_categories rc WHERE rc.role_id = r.id) AS category_count
     FROM roles r
     ORDER BY r.is_default DESC, r.is_admin DESC, r.name ASC`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows.map(row => ({
    id: row.ID,
    name: row.NAME,
    description: row.DESCRIPTION,
    is_default: row.IS_DEFAULT,
    is_admin: row.IS_ADMIN,
    is_active: row.IS_ACTIVE,
    created_at: row.CREATED_AT,
    user_count: row.USER_COUNT,
    category_count: row.CATEGORY_COUNT,
  }));
}

async function getRoleById(id) {
  const pool = getPool();
  const result = await pool.execute(
    `SELECT id, name, description, is_default, is_admin, is_active, created_at
     FROM roles WHERE id = :id`,
    { id },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.ID,
    name: row.NAME,
    description: row.DESCRIPTION,
    is_default: row.IS_DEFAULT,
    is_admin: row.IS_ADMIN,
    is_active: row.IS_ACTIVE,
    created_at: row.CREATED_AT,
  };
}

async function createRole({ name, description, is_default = 0, is_admin = 0 }) {
  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();

    if (is_default) {
      await connection.execute(
        `UPDATE roles SET is_default = 0 WHERE is_default = 1`,
        [],
        { autoCommit: false }
      );
    }

    const result = await connection.execute(
      `INSERT INTO roles (name, description, is_default, is_admin, is_active)
       VALUES (:name, :description, :isDefault, :isAdmin, 1)
       RETURNING id, created_at INTO :outId, :outCreatedAt`,
      {
        name,
        description: description || null,
        isDefault: is_default ? 1 : 0,
        isAdmin: is_admin ? 1 : 0,
        outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
        outCreatedAt: { type: oracledb.DATE, dir: oracledb.BIND_OUT },
      },
      { autoCommit: false }
    );

    await connection.commit();

    return {
      id: result.outBinds.outId[0],
      name,
      description,
      is_default: is_default ? 1 : 0,
      is_admin: is_admin ? 1 : 0,
      is_active: 1,
      created_at: result.outBinds.outCreatedAt[0],
    };
  } catch (err) {
    if (connection) await connection.rollback();
    if (err.errorNum === 1) {
      throw new ApiError(409, 'A role with this name already exists');
    }
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

async function updateRole(id, { name, description, is_default, is_admin, is_active }) {
  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();

    const existing = await connection.execute(
      `SELECT id, is_default FROM roles WHERE id = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (existing.rows.length === 0) {
      throw new ApiError(404, 'Role not found');
    }

    const updates = [];
    const binds = { id };

    if (name !== undefined) {
      updates.push('name = :name');
      binds.name = name;
    }
    if (description !== undefined) {
      updates.push('description = :description');
      binds.description = description;
    }
    if (is_admin !== undefined) {
      updates.push('is_admin = :isAdmin');
      binds.isAdmin = is_admin ? 1 : 0;
    }
    if (is_active !== undefined) {
      updates.push('is_active = :isActive');
      binds.isActive = is_active ? 1 : 0;
    }
    if (is_default !== undefined) {
      if (is_default) {
        await connection.execute(
          `UPDATE roles SET is_default = 0 WHERE is_default = 1 AND id != :id`,
          { id },
          { autoCommit: false }
        );
      }
      updates.push('is_default = :isDefault');
      binds.isDefault = is_default ? 1 : 0;
    }

    if (updates.length > 0) {
      await connection.execute(
        `UPDATE roles SET ${updates.join(', ')} WHERE id = :id`,
        binds,
        { autoCommit: false }
      );
    }

    await connection.commit();

    return getRoleById(id);
  } catch (err) {
    if (connection) await connection.rollback();
    if (err.errorNum === 1) {
      throw new ApiError(409, 'A role with this name already exists');
    }
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

async function deleteRole(id) {
  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();

    const check = await connection.execute(
      `SELECT is_default, is_admin FROM roles WHERE id = :id`,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (check.rows.length === 0) {
      throw new ApiError(404, 'Role not found');
    }

    if (check.rows[0].IS_DEFAULT === 1) {
      throw new ApiError(400, 'Cannot delete the default role');
    }

    await connection.execute(
      `DELETE FROM role_categories WHERE role_id = :id`,
      { id }
    );

    await connection.execute(
      `DELETE FROM user_roles WHERE role_id = :id`,
      { id }
    );

    await connection.execute(
      `DELETE FROM roles WHERE id = :id`,
      { id },
      { autoCommit: false }
    );

    await connection.commit();
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

async function assignCategories(roleId, categoryIds) {
  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();

    await connection.execute(
      `DELETE FROM role_categories WHERE role_id = :roleId`,
      { roleId }
    );

    for (const catId of categoryIds) {
      await connection.execute(
        `INSERT INTO role_categories (role_id, category_id) VALUES (:roleId, :catId)`,
        { roleId, catId }
      );
    }

    await connection.commit();
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

async function getRoleCategories(roleId) {
  const pool = getPool();
  const result = await pool.execute(
    `SELECT c.id, c.name, c.description, c.created_at
     FROM categories c
     JOIN role_categories rc ON c.id = rc.category_id
     WHERE rc.role_id = :roleId
     ORDER BY c.name ASC`,
    { roleId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows.map(row => ({
    id: row.ID,
    name: row.NAME,
    description: row.DESCRIPTION,
    created_at: row.CREATED_AT,
  }));
}

async function removeCategory(roleId, categoryId) {
  const pool = getPool();
  const result = await pool.execute(
    `DELETE FROM role_categories WHERE role_id = :roleId AND category_id = :categoryId`,
    { roleId, categoryId },
    { autoCommit: true }
  );

  if (result.rowsAffected === 0) {
    throw new ApiError(404, 'Category not assigned to this role');
  }
}

module.exports = {
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignCategories,
  getRoleCategories,
  removeCategory,
};
