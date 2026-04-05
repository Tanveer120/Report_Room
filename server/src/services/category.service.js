const oracledb = require('oracledb');
const { getPool } = require('../config/connection-manager');
const ApiError = require('../utils/api-error');

async function listCategories() {
  const pool = getPool();
  const result = await pool.execute(
    `SELECT c.id, c.name, c.description, c.created_at,
            (SELECT COUNT(*) FROM report_categories rc 
             JOIN reports r ON rc.report_id = r.id 
             WHERE rc.category_id = c.id AND r.is_active = 1) AS report_count,
            (SELECT COUNT(*) FROM role_categories rc WHERE rc.category_id = c.id) AS role_count
     FROM categories c
     ORDER BY c.name ASC`,
    [],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows.map(row => ({
    id: row.ID,
    name: row.NAME,
    description: row.DESCRIPTION,
    created_at: row.CREATED_AT,
    report_count: row.REPORT_COUNT,
    role_count: row.ROLE_COUNT,
  }));
}

async function getCategoryById(id) {
  const pool = getPool();
  const result = await pool.execute(
    `SELECT id, name, description, created_at FROM categories WHERE id = :id`,
    { id },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.ID,
    name: row.NAME,
    description: row.DESCRIPTION,
    created_at: row.CREATED_AT,
  };
}

async function createCategory({ name, description }) {
  const pool = getPool();
  const result = await pool.execute(
    `INSERT INTO categories (name, description)
     VALUES (:name, :description)
     RETURNING id, created_at INTO :outId, :outCreatedAt`,
    {
      name,
      description: description || null,
      outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      outCreatedAt: { type: oracledb.DATE, dir: oracledb.BIND_OUT },
    },
    { autoCommit: true }
  );

  return {
    id: result.outBinds.outId[0],
    name,
    description,
    created_at: result.outBinds.outCreatedAt[0],
  };
}

async function updateCategory(id, { name, description }) {
  const pool = getPool();
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

  if (updates.length === 0) {
    throw new ApiError(400, 'No fields to update');
  }

  const result = await pool.execute(
    `UPDATE categories SET ${updates.join(', ')} WHERE id = :id`,
    binds,
    { autoCommit: true }
  );

  if (result.rowsAffected === 0) {
    throw new ApiError(404, 'Category not found');
  }

  return getCategoryById(id);
}

async function deleteCategory(id) {
  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();

    await connection.execute(
      `DELETE FROM role_categories WHERE category_id = :id`,
      { id }
    );

    await connection.execute(
      `DELETE FROM report_categories WHERE category_id = :id`,
      { id }
    );

    const result = await connection.execute(
      `DELETE FROM categories WHERE id = :id`,
      { id },
      { autoCommit: false }
    );

    if (result.rowsAffected === 0) {
      throw new ApiError(404, 'Category not found');
    }

    await connection.commit();
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
