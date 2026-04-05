const oracledb = require('oracledb');
const { getPool } = require('../config/connection-manager');

async function canAccessReport(userId, reportId) {
  const pool = getPool();

  const result = await pool.execute(
    `SELECT COUNT(*) AS cat_count FROM report_categories WHERE report_id = :reportId`,
    { reportId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const reportCatCount = result.rows[0].CAT_COUNT;

  if (reportCatCount === 0) {
    return true;
  }

  const adminCheck = await pool.execute(
    `SELECT COUNT(*) AS admin_count
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = :userId AND r.is_admin = 1`,
    { userId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (adminCheck.rows[0].ADMIN_COUNT > 0) {
    return true;
  }

  const accessCheck = await pool.execute(
    `SELECT COUNT(*) AS access_count
     FROM report_categories rc
     JOIN role_categories rcat ON rc.category_id = rcat.category_id
     JOIN user_roles ur ON rcat.role_id = ur.role_id
     WHERE rc.report_id = :reportId AND ur.user_id = :userId`,
    { reportId, userId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return accessCheck.rows[0].ACCESS_COUNT > 0;
}

async function getUserAccessibleCategoryIds(userId) {
  const pool = getPool();

  const adminCheck = await pool.execute(
    `SELECT COUNT(*) AS admin_count
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = :userId AND r.is_admin = 1`,
    { userId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (adminCheck.rows[0].ADMIN_COUNT > 0) {
    return null;
  }

  const result = await pool.execute(
    `SELECT DISTINCT rc.category_id
     FROM role_categories rc
     JOIN user_roles ur ON rc.role_id = ur.role_id
     WHERE ur.user_id = :userId`,
    { userId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows.map(r => r.CATEGORY_ID);
}

module.exports = {
  canAccessReport,
  getUserAccessibleCategoryIds,
};
