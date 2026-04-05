const { exportToExcel } = require('../services/export.service');
const asyncHandler = require('../utils/async-handler');

const exportReport = asyncHandler(async (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  if (isNaN(reportId)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid report ID' } });
  }

  await exportToExcel(reportId, req.body, req.user.id, res);
});

module.exports = {
  exportReport,
};
