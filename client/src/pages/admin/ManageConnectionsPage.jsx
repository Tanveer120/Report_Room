import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/apiClient';
import Input from '../../components/Input';
import toast from 'react-hot-toast';

export default function ManageConnectionsPage() {
  const [connections, setConnections] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState({ label: '', user: '', password: '', connectString: '' });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/admin/connections');
      const map = {};
      data.data.forEach(c => {
        map[c.key] = { label: c.label, user: c.user, password: '', connectString: c.connectString };
      });
      setConnections(map);
    } catch {
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleAdd = () => {
    const key = `connection_${Date.now()}`;
    setConnections(prev => ({ ...prev, [key]: { label: '', user: '', password: '', connectString: '' } }));
    setEditingKey(key);
    setForm({ label: '', user: '', password: '', connectString: '' });
  };

  const handleEdit = (key) => {
    setEditingKey(key);
    setForm(connections[key] || { label: '', user: '', password: '', connectString: '' });
  };

  const handleDelete = (key) => {
    if (key === 'default') {
      toast.error('Cannot delete the default connection');
      return;
    }
    setConnections(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (editingKey === key) {
      setEditingKey(null);
      setForm({ label: '', user: '', password: '', connectString: '' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post('/admin/connections', connections);
      toast.success('Connections saved');
      fetchConnections();
      setEditingKey(null);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save connections');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!form.user || !form.password || !form.connectString) {
      toast.error('Fill in user, password, and connect string to test');
      return;
    }
    setTesting(true);
    try {
      const { data } = await apiClient.post('/admin/connections/test', {
        user: form.user,
        password: form.password,
        connectString: form.connectString,
      });
      toast.success(data.data.message);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin-slow h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-100">Database Connections</h1>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={handleAdd}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Connection
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection List */}
        <div className="lg:col-span-1 space-y-2">
          {Object.entries(connections).map(([key, conn]) => (
            <button
              key={key}
              onClick={() => handleEdit(key)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                editingKey === key
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-surface-900 dark:text-surface-100">
                    {conn.label || key}
                  </span>
                  {key === 'default' && (
                    <span className="ml-2 badge badge-info">Default</span>
                  )}
                </div>
                {key !== 'default' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(key); }}
                    className="text-surface-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-xs text-surface-400 mt-1 truncate">{conn.connectString || 'Not configured'}</p>
            </button>
          ))}
        </div>

        {/* Connection Form */}
        <div className="lg:col-span-2">
          {editingKey ? (
            <div className="card space-y-4">
              <h2 className="text-lg font-medium text-surface-900 dark:text-surface-100">
                {connections[editingKey]?.label || 'New Connection'}
              </h2>
              <Input
                label="Display Name"
                value={form.label}
                onChange={(e) => {
                  setForm(f => ({ ...f, label: e.target.value }));
                  setConnections(prev => ({ ...prev, [editingKey]: { ...prev[editingKey], label: e.target.value } }));
                }}
                placeholder="e.g., Finance Database"
              />
              <Input
                label="Username"
                value={form.user}
                onChange={(e) => {
                  setForm(f => ({ ...f, user: e.target.value }));
                  setConnections(prev => ({ ...prev, [editingKey]: { ...prev[editingKey], user: e.target.value } }));
                }}
                placeholder="Oracle username"
              />
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={(e) => {
                  setForm(f => ({ ...f, password: e.target.value }));
                  setConnections(prev => ({ ...prev, [editingKey]: { ...prev[editingKey], password: e.target.value } }));
                }}
                placeholder="Oracle password"
              />
              <Input
                label="Connect String"
                value={form.connectString}
                onChange={(e) => {
                  setForm(f => ({ ...f, connectString: e.target.value }));
                  setConnections(prev => ({ ...prev, [editingKey]: { ...prev[editingKey], connectString: e.target.value } }));
                }}
                placeholder="host:port/service"
              />
              <div className="flex items-center gap-3">
                <button className="btn-secondary" onClick={handleTest} disabled={testing}>
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-surface-500">Select a connection to edit, or add a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
