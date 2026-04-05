import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usersApi, rolesApi } from '../../api/adminApi';
import Input from '../../components/Input';
import RoleCheckboxGroup from '../../components/admin/RoleCheckboxGroup';
import toast from 'react-hot-toast';

export default function UserEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const fetchRoles = useCallback(async () => {
    try {
      const { data } = await rolesApi.list();
      setAllRoles(data.data);
    } catch {
      toast.error('Failed to load roles');
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const { data } = await usersApi.getById(id);
      setUsername(data.data.username);
      setEmail(data.data.email);
      setRoleIds(data.data.roles.map((r) => r.id));
    } catch {
      toast.error('Failed to load user');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchRoles();
    if (isEdit) fetchUser();
  }, [isEdit, fetchRoles, fetchUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) { toast.error('Username is required'); return; }
    if (!email.trim()) { toast.error('Email is required'); return; }
    if (!isEdit && !password) { toast.error('Password is required'); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await usersApi.assignRoles(id, roleIds);
        toast.success('User updated');
      } else {
        await usersApi.create({ username, email, password, roleIds });
        toast.success('User created');
      }
      navigate('/admin/users');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save user');
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-100">
          {isEdit ? 'Edit User' : 'New User'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-4">
          <Input label="Username *" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <Input label="Email *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {!isEdit && (
            <Input label="Password *" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-4">Assign Roles</h2>
          <RoleCheckboxGroup
            roles={allRoles}
            selectedRoleIds={roleIds}
            onChange={setRoleIds}
          />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/admin/users')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
