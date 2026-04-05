const ExcelJS = require('exceljs');
const { EXPORT_STREAM_THRESHOLD } = require('../utils/constants');
const { fetchReportRowsForExport } = require('./execute.service');
const { canAccessReport } = require('./access.service');
const { withExportLimit } = require('../utils/semaphore');
const ApiError = require('../utils/api-error');

function generateFilename(reportName) {
  const sanitized = reportName.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${sanitized}_${timestamp}.xlsx`;
}

function buildColumns(metaData) {
  return metaData.map(col => ({
    header: col.name,
    key: col.name,
    width: Math.max(col.name.length + 4, 15),
  }));
}

function styleHeaderRow(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  headerRow.alignment = { vertical: 'middle' };
}

async function exportSmall(res, reportName, data) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');

  sheet.columns = buildColumns(data.metaData);
  styleHeaderRow(sheet);

  for (const row of data.rows) {
    const obj = {};
    data.metaData.forEach(col => {
      obj[col.name] = row[col.name];
    });
    sheet.addRow(obj);
  }

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${generateFilename(reportName)}"`);

  await workbook.xlsx.write(res);
  res.end();
}

async function exportLarge(res, reportName, data) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${generateFilename(reportName)}"`);

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
  const sheet = workbook.addWorksheet('Report');

  sheet.columns = buildColumns(data.metaData);
  styleHeaderRow(sheet);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  for (const row of data.rows) {
    const obj = {};
    data.metaData.forEach(col => {
      obj[col.name] = row[col.name];
    });
    sheet.addRow(obj).commit();
  }

  await workbook.commit();
}

async function exportToExcel(reportId, userParams, userId, res) {
  const hasAccess = await canAccessReport(userId, reportId);
  if (!hasAccess) {
    throw new ApiError(403, 'You do not have permission to export this report');
  }

  await withExportLimit(async () => {
    const data = await fetchReportRowsForExport(reportId, userParams);

    if (data.rowCount === 0) {
      throw new ApiError(404, 'No data found for the given parameters');
    }

    if (data.rowCount >= EXPORT_STREAM_THRESHOLD) {
      await exportLarge(res, data.reportName, data);
    } else {
      await exportSmall(res, data.reportName, data);
    }
  });
}

module.exports = {
  exportToExcel,
};
