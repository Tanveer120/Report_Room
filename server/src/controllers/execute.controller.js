const { executeReport, getExecutionLogs } = require('../services/execute.service');
const asyncHandler = require('../utils/async-handler');

const execute = asyncHandler(async (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  if (isNaN(reportId)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid report ID' } });
  }

  const result = await executeReport(reportId, req.body, req.user.id);

  res.json({
    success: true,
    data: {
      rows: result.rows,
      metaData: result.metaData,
      rowCount: result.rowCount,
      executionTimeMs: result.executionTimeMs,
    },
  });
});

const logs = asyncHandler(async (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  if (isNaN(reportId)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid report ID' } });
  }

  const isAdmin = !!req.user.isAdmin;
  const { page = 1, pageSize = 20 } = req.query;

  const result = await getExecutionLogs(reportId, req.user.id, {
    isAdmin,
    page: parseInt(page, 10),
    pageSize: parseInt(pageSize, 10),
  });

  res.json({ success: true, data: result });
});

module.exports = {
  execute,
  logs,
};
