const oracledb = require('oracledb');
const { getPool } = require('../config/connection-manager');
const queryEngine = require('./query-engine');
const { getReportById, getParamsByReportId } = require('./report.service');
const { canAccessReport } = require('./access.service');
const ApiError = require('../utils/api-error');
const { MAX_MULTI_VALUES } = require('../utils/constants');

async function executeReport(reportId, userParams, userId) {
  const report = await getReportById(reportId, { isAdmin: true });

  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  if (!report.is_active) {
    throw new ApiError(400, 'Report is not active');
  }

  const hasAccess = await canAccessReport(userId, reportId);
  if (!hasAccess) {
    throw new ApiError(403, 'You do not have permission to run this report');
  }

  const paramDefs = await getParamsByReportId(reportId);

  _validateParamValues(userParams, paramDefs);

  const startTime = Date.now();

  try {
    const result = await queryEngine.execute(report.sql_query, paramDefs, userParams, report.connection_key);
    const executionTimeMs = Date.now() - startTime;

    await _logExecution({
      reportId,
      userId,
      paramsJson: JSON.stringify(userParams),
      rowCount: result.rowCount,
      executionTimeMs,
      status: 'success',
    });

    return {
      rows: result.rows,
      metaData: result.metaData,
      rowCount: result.rowCount,
      executionTimeMs,
    };
  } catch (err) {
    const executionTimeMs = Date.now() - startTime;

    try {
      await _logExecution({
        reportId,
        userId,
        paramsJson: JSON.stringify(userParams),
        rowCount: 0,
        executionTimeMs,
        status: 'error',
        errorMessage: err.message,
      });
    } catch (logErr) {
      // Log failure should not mask the original query error
    }

    throw err;
  }
}

async function getExecutionLogs(reportId, userId, { isAdmin = false, page = 1, pageSize = 20 } = {}) {
  const pool = getPool();
  const offset = (page - 1) * pageSize;

  const whereClause = isAdmin
    ? 'el.report_id = :reportId'
    : 'el.report_id = :reportId AND el.user_id = :userId';

  const countBinds = isAdmin ? { reportId } : { reportId, userId };
  const countResult = await pool.execute(
    `SELECT COUNT(*) AS total FROM execution_logs el WHERE ${whereClause}`,
    countBinds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const total = countResult.rows[0].TOTAL;

  const queryBinds = isAdmin ? { reportId, offset, pageSize } : { reportId, userId, offset, pageSize };
  const result = await pool.execute(
    `SELECT el.id, el.report_id, el.user_id, u.username,
            el.params_json, el.row_count, el.execution_time_ms,
            el.status, el.error_message, el.executed_at
     FROM execution_logs el
     JOIN users u ON el.user_id = u.id
     WHERE ${whereClause}
     ORDER BY el.executed_at DESC
     OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`,
    queryBinds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return {
    logs: result.rows.map(row => ({
      id: row.ID,
      report_id: row.REPORT_ID,
      user_id: row.USER_ID,
      username: row.USERNAME,
      params_json: row.PARAMS_JSON,
      row_count: row.ROW_COUNT,
      execution_time_ms: row.EXECUTION_TIME_MS,
      status: row.STATUS,
      error_message: row.ERROR_MESSAGE,
      executed_at: row.EXECUTED_AT,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

function _validateParamValues(userParams, paramDefs) {
  for (const def of paramDefs) {
    const value = userParams[def.param_name];

    if (def.is_required) {
      if (value === undefined || value === null || value === '') {
        throw new ApiError(400, `Parameter '${def.param_label}' is required`);
      }
      if (Array.isArray(value) && value.length === 0) {
        throw new ApiError(400, `Parameter '${def.param_label}' is required`);
      }
    }

    if (def.param_type === 'multi_value' && Array.isArray(value)) {
      if (value.length > MAX_MULTI_VALUES) {
        throw new ApiError(400, `Parameter '${def.param_label}' exceeds maximum of ${MAX_MULTI_VALUES} values`);
      }
    }
  }
}

async function _logExecution({ reportId, userId, paramsJson, rowCount, executionTimeMs, status, errorMessage }) {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO execution_logs (report_id, user_id, params_json, row_count, execution_time_ms, status, error_message)
     VALUES (:reportId, :userId, :paramsJson, :rowCount, :executionTimeMs, :status, :errorMessage)`,
    {
      reportId,
      userId,
      paramsJson: { val: paramsJson || null, type: oracledb.DB_TYPE_CLOB },
      rowCount: rowCount || null,
      executionTimeMs: executionTimeMs || null,
      status,
      errorMessage: { val: errorMessage ? errorMessage.substring(0, 4000) : null, type: oracledb.DB_TYPE_CLOB },
    },
    { autoCommit: true }
  );
}

async function fetchReportRowsForExport(reportId, userParams) {
  const report = await getReportById(reportId, { isAdmin: true });

  if (!report) {
    throw new ApiError(404, 'Report not found');
  }

  if (!report.is_active) {
    throw new ApiError(400, 'Report is not active');
  }

  const paramDefs = await getParamsByReportId(reportId);
  _validateParamValues(userParams, paramDefs);

  const result = await queryEngine.execute(report.sql_query, paramDefs, userParams, report.connection_key);

  return {
    reportName: report.name,
    rows: result.rows,
    metaData: result.metaData,
    rowCount: result.rowCount,
  };
}

module.exports = {
  executeReport,
  getExecutionLogs,
  fetchReportRowsForExport,
};
