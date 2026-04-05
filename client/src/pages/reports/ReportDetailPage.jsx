import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import DynamicParamForm from '../../components/reports/DynamicParamForm';
import ResultsTable from '../../components/reports/ResultsTable';
import ExecutionHistory from '../../components/reports/ExecutionHistory';
import { SkeletonCard, SkeletonTable } from '../../components/Skeleton';
import { EmptyState } from '../../components';
import toast from 'react-hot-toast';

export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [params, setParams] = useState({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [showLogs, setShowLogs] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setAccessDenied(false);
    try {
      const { data } = await apiClient.get(`/reports/${id}`);
      setReport(data.data);
      const initialParams = {};
      data.data.params?.forEach((p) => {
        if (p.default_value) initialParams[p.param_name] = p.default_value;
      });
      setParams(initialParams);
    } catch (err) {
      if (err.response?.status === 403) {
        setAccessDenied(true);
      } else {
        toast.error('Failed to load report');
        navigate('/reports');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleParamChange = useCallback((name, value) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setResult(null);
    try {
      const { data } = await apiClient.post(`/reports/${id}/execute`, params);
      setResult(data.data);
      toast.success(`Query completed in ${data.data.executionTimeMs}ms`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Query execution failed');
    } finally {
      setRunning(false);
    }
  }, [id, params]);

  const handleExport = useCallback(async () => {
    try {
      const response = await apiClient.post(`/reports/${id}/export`, params, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const disposition = response.headers['content-disposition'];
      const filename = disposition
        ? disposition.split('filename=')[1]?.replace(/"/g, '') || 'report.xlsx'
        : 'report.xlsx';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export started');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Export failed');
    }
  }, [id, params]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
        <SkeletonCard />
        <SkeletonTable />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <EmptyState
        title="Access Denied"
        description="You do not have permission to view this report."
        action={
          <button className="btn-primary" onClick={() => navigate('/reports')}>
            Back to Reports
          </button>
        }
      />
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-100">{report.name}</h1>
          {report.description && (
            <p className="text-surface-500 mt-1">{report.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={handleExport} disabled={running}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {report.params && report.params.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-medium text-surface-700 mb-4">Parameters</h2>
          <DynamicParamForm
            params={report.params}
            values={params}
            onChange={handleParamChange}
            onSubmit={handleRun}
            submitLabel="Run Report"
            running={running}
          />
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-surface-700">
              Results ({result.rowCount} rows, {result.executionTimeMs}ms)
            </h2>
            <button
              className="text-sm text-primary-600 hover:text-primary-700"
              onClick={() => setShowLogs(!showLogs)}
            >
              {showLogs ? 'Hide' : 'Show'} execution logs
            </button>
          </div>
          <ResultsTable
            metaData={result.metaData}
            rows={result.rows.slice(0, 100)}
            rowCount={result.rowCount}
          />
        </div>
      )}

      {showLogs && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-surface-700">Execution Logs</h2>
          <ExecutionHistory reportId={id} />
        </div>
      )}
    </div>
  );
}
